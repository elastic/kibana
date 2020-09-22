/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { executeEsQueryFactory, OTHER_CATEGORY } from './es_query_builder';
import { AlertServices } from '../../../../alerts/server';
import { ActionGroupId } from './alert_type';
import { Logger } from '../../types';

interface LatestEntityLocation {
  location: string;
  shapeLocationId: string;
  entityName: string;
  dateInShape: string;
  docId: string;
}

// Flatten agg results and get latest locations for each entity
function transformResults(
  results: SearchResponse<unknown>,
  dateField: string,
  geoField: string
): LatestEntityLocation[] {
  return (
    _.chain(results)
      .get('aggregations.shapes.buckets', {})
      // @ts-expect-error
      .flatMap((bucket: unknown, bucketKey: string) => {
        const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
        return _.map(subBuckets, (subBucket) => ({
          location: _.get(subBucket, `entityHits.hits.hits[0].fields.${geoField}`, null),
          shapeLocationId: bucketKey,
          entityName: subBucket.key,
          dateInShape: _.get(subBucket, `entityHits.hits.hits[0].fields.${dateField}[0]`, null),
          docId: _.get(subBucket, `entityHits.hits.hits[0]._id`),
        }));
      })
      .orderBy(['entityName', 'dateInShape'], ['asc', 'desc'])
      .sortedUniqBy('entityName')
      .value()
  );
}

interface EntityMovementDescriptor {
  entityName: string;
  currLocation: {
    location: string;
    shapeId: string;
    date: string;
    docId: string;
  };
  prevLocation: {
    location: string;
    shapeId: string;
    date: string;
    docId: string;
  };
}

function getMovedEntities(
  prevToCurrentIntervalResults: SearchResponse<unknown>,
  currentIntervalResults: SearchResponse<unknown>,
  trackingEvent: string,
  dateField: string,
  geoField: string
): EntityMovementDescriptor[] {
  const currLocationArr = transformResults(currentIntervalResults, dateField, geoField);
  const prevLocationArr = transformResults(prevToCurrentIntervalResults, dateField, geoField);

  return (
    currLocationArr
      // Check if shape has a previous location and has moved
      .reduce(
        (
          accu: EntityMovementDescriptor[],
          {
            entityName,
            shapeLocationId,
            dateInShape,
            location,
            docId,
          }: {
            entityName: string;
            shapeLocationId: string;
            dateInShape: string;
            location: string;
            docId: string;
          }
        ) => {
          const prevLocationObj = prevLocationArr.find(
            (locationObj: LatestEntityLocation) => locationObj.entityName === entityName
          );
          if (!prevLocationObj) {
            return accu;
          }
          if (shapeLocationId !== prevLocationObj.shapeLocationId) {
            accu.push({
              entityName,
              currLocation: {
                location,
                shapeId: shapeLocationId,
                date: dateInShape,
                docId,
              },
              prevLocation: {
                location: prevLocationObj.location,
                shapeId: prevLocationObj.shapeLocationId,
                date: prevLocationObj.dateInShape,
                docId: prevLocationObj.docId,
              },
            });
          }
          return accu;
        },
        []
      )
      // Do not track entries to or exits from 'other'
      .filter((entityMovementDescriptor: EntityMovementDescriptor) =>
        trackingEvent === 'entered'
          ? entityMovementDescriptor.currLocation.shapeId !== OTHER_CATEGORY
          : entityMovementDescriptor.prevLocation.shapeId !== OTHER_CATEGORY
      )
  );
}

export const getGeoThresholdExecutor = ({ logger: log }: { logger: Logger }) =>
  async function ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
  }: {
    previousStartedAt: Date | null;
    startedAt: Date;
    services: AlertServices;
    params: {
      indexTitle: string;
      indexId: string;
      geoField: string;
      entity: string;
      dateField: string;
      trackingEvent: string;
      boundaryType: string;
      boundaryIndexTitle: string;
      boundaryIndexId: string;
      boundaryGeoField: string;
    };
  }) {
    const executeEsQuery = await executeEsQueryFactory(params, services, log);

    const currentIntervalResults: SearchResponse<unknown> | undefined = await executeEsQuery(
      currIntervalStartTime,
      currIntervalEndTime
    );
    // No need to compare if no changes in current interval
    if (!_.get(currentIntervalResults, 'hits.total.value')) {
      return;
    }
    const prevToCurrentIntervalResults: SearchResponse<unknown> | undefined = await executeEsQuery(
      null,
      currIntervalStartTime
    );

    if (!prevToCurrentIntervalResults || !currentIntervalResults) {
      return;
    }

    const movedEntities: EntityMovementDescriptor[] = getMovedEntities(
      prevToCurrentIntervalResults,
      currentIntervalResults,
      params.trackingEvent,
      params.dateField,
      params.geoField
    );

    movedEntities.forEach(({ entityName, currLocation, prevLocation }) =>
      services.alertInstanceFactory(entityName).scheduleActions(ActionGroupId, {
        crossingEventTimeStamp: currLocation.date,
        currentLocation: currLocation.location,
        currentBoundaryId: currLocation.shapeId,
        previousLocation: prevLocation.location,
        previousBoundaryId: prevLocation.shapeId,
        crossingDocumentId: currLocation.docId,
        timeOfDetection: currIntervalEndTime,
      })
    );
  };
