/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { executeEsQueryFactory, getShapesFilters, OTHER_CATEGORY } from './es_query_builder';
import { AlertServices, AlertTypeState } from '../../../../alerts/server';
import { ActionGroupId } from './alert_type';
import { Logger } from '../../types';

interface LatestEntityLocation {
  location: number[] | null;
  shapeLocationId: string;
  entityName: string;
  dateInShape: string | null;
  docId: string;
}

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: SearchResponse<unknown> | undefined,
  dateField: string,
  geoField: string
): LatestEntityLocation[] {
  if (!results) {
    return [];
  }

  return (
    _.chain(results)
      .get('aggregations.shapes.buckets', {})
      // @ts-expect-error
      .flatMap((bucket: unknown, bucketKey: string) => {
        const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
        return _.map(subBuckets, (subBucket) => {
          const locationFieldResult = _.get(`entityHits.hits.hits[0].fields.${geoField}[0]`, '');
          const location = locationFieldResult
            ? _.chain(locationFieldResult)
                .split(', ')
                .map((coordString) => +coordString)
                .reverse()
                .value()
            : null;
          const dateInShape = _.get(
            subBucket,
            `entityHits.hits.hits[0].fields.${dateField}[0]`,
            null
          );
          const docId = _.get(subBucket, `entityHits.hits.hits[0]._id`);

          return {
            location,
            shapeLocationId: bucketKey,
            entityName: subBucket.key,
            dateInShape,
            docId,
          };
        });
      })
      .orderBy(['entityName', 'dateInShape'], ['asc', 'desc'])
      .sortedUniqBy('entityName')
      .value()
  );
}

interface EntityMovementDescriptor {
  entityName: string;
  currLocation: {
    location: number[] | null;
    shapeId: string;
    date: string | null;
    docId: string;
  };
  prevLocation: {
    location: number[] | null;
    shapeId: string;
    date: string | null;
    docId: string;
  };
}

export function getMovedEntities(
  currLocationArr: LatestEntityLocation[],
  prevLocationArr: LatestEntityLocation[],
  trackingEvent: string
): EntityMovementDescriptor[] {
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
            dateInShape: string | null;
            location: number[] | null;
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
    alertId,
    state,
  }: {
    previousStartedAt: Date | null;
    startedAt: Date;
    services: AlertServices;
    params: {
      index: string;
      indexId: string;
      geoField: string;
      entity: string;
      dateField: string;
      trackingEvent: string;
      boundaryType: string;
      boundaryIndexTitle: string;
      boundaryIndexId: string;
      boundaryGeoField: string;
      boundaryNameField?: string;
    };
    alertId: string;
    state: AlertTypeState;
  }) {
    const { shapesFilters, shapesIdsNamesMap } = state.shapesFilters
      ? state
      : await getShapesFilters(
          params.boundaryIndexTitle,
          params.boundaryGeoField,
          params.geoField,
          services.callCluster,
          log,
          alertId,
          params.boundaryNameField
        );

    const executeEsQuery = await executeEsQueryFactory(params, services, log, shapesFilters);

    // Run largest query & grab shape filters on first run capturing anything
    // up to current interval
    if (!currIntervalStartTime) {
      const prevToCurrentIntervalResults:
        | SearchResponse<unknown>
        | undefined = await executeEsQuery(null, currIntervalEndTime);
      return {
        prevLocationArr: transformResults(
          prevToCurrentIntervalResults,
          params.dateField,
          params.geoField
        ),
      };
    }

    const currentIntervalResults: SearchResponse<unknown> | undefined = await executeEsQuery(
      currIntervalStartTime,
      currIntervalEndTime
    );
    // No need to compare if no changes in current interval
    if (!_.get(currentIntervalResults, 'hits.total.value')) {
      return state;
    }

    const currLocationArr: LatestEntityLocation[] = transformResults(
      currentIntervalResults,
      params.dateField,
      params.geoField
    );

    const movedEntities: EntityMovementDescriptor[] = getMovedEntities(
      currLocationArr,
      state.prevLocationArr,
      params.trackingEvent
    );

    // Create alert instances
    movedEntities.forEach(({ entityName, currLocation, prevLocation }) => {
      services
        .alertInstanceFactory(
          `${entityName}-${shapesIdsNamesMap[currLocation.shapeId] || currLocation.shapeId}`
        )
        .scheduleActions(ActionGroupId, {
          crossingEventTimeStamp: currLocation.date,
          currentLocation: currLocation.location,
          currentBoundaryId: currLocation.shapeId,
          previousLocation: prevLocation.location,
          previousBoundaryId: prevLocation.shapeId,
          crossingLine: [prevLocation.location, currLocation.location],
          crossingDocumentId: currLocation.docId,
          timeOfDetection: currIntervalEndTime,
        });
    });

    // Combine previous results w/ current results for state of next run
    const prevLocationArr = _.chain(currLocationArr)
      .concat(state.prevLocationArr)
      .orderBy(['entityName', 'dateInShape'], ['asc', 'desc'])
      .sortedUniqBy('entityName')
      .value();

    return {
      prevLocationArr,
      shapesFilters,
      shapesIdsNamesMap,
    };
  };
