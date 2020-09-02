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
function transformResults(results) {
  return _.chain(results)
    .get('aggregations.shapes.buckets', {})
    .flatMap((bucket, bucketKey) => {
      const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
      return _.map(subBuckets, (subBucket) => ({
        shapeLocation: bucketKey,
        entityName: subBucket.key,
        dateInShape: _.get(subBucket, 'entityHits.hits.hits[0].fields.date[0]', null),
      }));
    })
    .orderBy(['entityName', 'dateInShape'], ['desc', 'desc'])
    .uniqBy('entityName')
    .value();
}

function getMovedEntities(prevToCurrentIntervalResults, currentIntervalResults, trackingEvent) {
  const currLocationArr = transformResults(currentIntervalResults);
  const prevLocationArr = transformResults(prevToCurrentIntervalResults);

  return (
    currLocationArr
      // Check if shape has a previous location and has moved
      .reduce((accu, { entityName, shapeLocation, dateInShape }) => {
        const prevLocationObj = prevLocationArr.find(
          (locationObj) => locationObj.entityName === entityName
        );
        if (!prevLocationObj) {
          return accu;
        }
        if (shapeLocation !== prevLocationObj.shapeLocation) {
          accu.push({
            entityName,
            currLocation: {
              shape: shapeLocation,
              date: dateInShape,
            },
            prevLocation: {
              shape: prevLocationObj.shapeLocation,
              date: prevLocationObj.dateInShape,
            },
          });
        }
        return accu;
      }, [])
      // Do not track entries to or exits from 'other'
      .filter((entityMovementDescriptor) =>
        trackingEvent === 'entered'
          ? entityMovementDescriptor.currLocation.shape !== OTHER_CATEGORY
          : entityMovementDescriptor.prevLocation.shape !== OTHER_CATEGORY
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
      geoField: string; // But also add support for this
      entity: string; //
      dateField: string; //
      trackingEvent: TrackingEvent; //
      boundaryType: BoundaryType;
      boundaryIndex: string; //
      boundaryGeoField: string; //
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
      params.trackingEvent
    );

    movedEntities.forEach(({ entityName, currLocation, prevLocation }) =>
      services.alertInstanceFactory(entityName).scheduleActions(ActionGroupId)
    );
  };
