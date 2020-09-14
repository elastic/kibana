/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { executeEsQueryFactory, OTHER_CATEGORY } from './es_query_builder';
import { AlertServices } from '../../../../alerts/server';
import { ActionGroupId, BoundaryType, TrackingEvent } from './alert_type';

// Flatten agg results and get latest locations for each entity
function transformResults(results, dateField, geoField) {
  return _.chain(results)
    .get('aggregations.shapes.buckets', {})
    .flatMap((bucket, bucketKey) => {
      const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
      return _.map(subBuckets, (subBucket) => ({
        location: _.get(subBucket, `entityHits.hits.hits[0].fields.${geoField}`, null),
        shapeLocationId: bucketKey,
        entityName: subBucket.key,
        dateInShape: _.get(subBucket, `entityHits.hits.hits[0].fields.${dateField}[0]`, null),
      }));
    })
    .orderBy(['entityName', 'dateInShape'], ['asc', 'desc'])
    .sortedUniqBy('entityName')
    .value();
}

function getMovedEntities(
  prevToCurrentIntervalResults,
  currentIntervalResults,
  trackingEvent,
  dateField,
  geoField
) {
  const currLocationArr = transformResults(currentIntervalResults, dateField, geoField);
  const prevLocationArr = transformResults(prevToCurrentIntervalResults, dateField, geoField);

  return (
    currLocationArr
      // Check if shape has a previous location and has moved
      .reduce((accu, { entityName, shapeLocationId, dateInShape, location }) => {
        const prevLocationObj = prevLocationArr.find(
          (locationObj) => locationObj.entityName === entityName
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
            },
            prevLocation: {
              location: prevLocationObj.location,
              shapeId: prevLocationObj.shapeLocationId,
              date: prevLocationObj.dateInShape,
            },
          });
        }
        return accu;
      }, [])
      // Do not track entries to or exits from 'other'
      .filter((entityMovementDescriptor) =>
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
      index: string;
      geoField: string;
      entity: string;
      dateField: string;
      trackingEvent: TrackingEvent;
      boundaryType: BoundaryType;
      boundaryIndex: string;
      boundaryGeoField: string;
    };
  }) {
    const executeEsQuery = await executeEsQueryFactory(params, services, log);

    const currentIntervalResults = await executeEsQuery(currIntervalStartTime, currIntervalEndTime);
    // No need to compare if no changes in current interval
    if (!_.get(currentIntervalResults, 'hits.total.value')) {
      return;
    }
    const prevToCurrentIntervalResults = await executeEsQuery('', currIntervalStartTime);

    const movedEntities = getMovedEntities(
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
        crossingDocumentId: null,
        timeOfDetection: currIntervalEndTime,
      })
    );
  };
