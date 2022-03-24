/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection } from 'geojson';
import { i18n } from '@kbn/i18n';
import { FEATURE_VISIBLE_PROPERTY_NAME } from '../../../../../common/constants';
import { DataRequestContext } from '../../../../actions';
import { InnerJoin } from '../../../joins/inner_join';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';

interface SourceResult {
  refreshed: boolean;
  featureCollection: FeatureCollection;
}

export interface JoinState {
  dataHasChanged: boolean;
  join: InnerJoin;
  propertiesMap?: PropertiesMap;
}

export async function performInnerJoins(
  sourceResult: SourceResult,
  joinStates: JoinState[],
  updateSourceData: DataRequestContext['updateSourceData'],
  onJoinError: DataRequestContext['onJoinError']
) {
  // should update the store if
  // -- source result was refreshed
  // -- any of the join configurations changed (joinState changed)
  // -- visibility of any of the features has changed

  let shouldUpdateStore =
    sourceResult.refreshed || joinStates.some((joinState) => joinState.dataHasChanged);

  if (!shouldUpdateStore) {
    return;
  }

  const joinStatuses = joinStates.map((joinState) => {
    return {
      joinedWithAtLeastOneFeature: false,
      keys: [] as string[],
      joinState,
    };
  });

  for (let i = 0; i < sourceResult.featureCollection.features.length; i++) {
    const feature = sourceResult.featureCollection.features[i];
    if (!feature.properties) {
      feature.properties = {};
    }
    const oldVisbility = feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
    let isFeatureVisible = true;
    for (let j = 0; j < joinStates.length; j++) {
      const joinState = joinStates[j];
      const innerJoin = joinState.join;
      const joinStatus = joinStatuses[j];
      const joinKey = innerJoin.getJoinKey(feature);
      if (joinKey !== null) {
        joinStatus.keys.push(joinKey);
      }
      const canJoinOnCurrent = joinState.propertiesMap
        ? innerJoin.joinPropertiesToFeature(feature, joinState.propertiesMap)
        : false;
      if (canJoinOnCurrent && !joinStatus.joinedWithAtLeastOneFeature) {
        joinStatus.joinedWithAtLeastOneFeature = true;
      }
      isFeatureVisible = isFeatureVisible && canJoinOnCurrent;
    }

    if (oldVisbility !== isFeatureVisible) {
      shouldUpdateStore = true;
    }

    feature.properties[FEATURE_VISIBLE_PROPERTY_NAME] = isFeatureVisible;
  }

  if (shouldUpdateStore) {
    updateSourceData({ ...sourceResult.featureCollection });
  }

  const joinStatusesWithoutAnyMatches = joinStatuses.filter((joinStatus) => {
    return (
      !joinStatus.joinedWithAtLeastOneFeature && joinStatus.joinState.propertiesMap !== undefined
    );
  });

  if (joinStatusesWithoutAnyMatches.length) {
    function prettyPrintArray(array: unknown[]) {
      return array.length <= 5
        ? array.join(',')
        : array.slice(0, 5).join(',') +
            i18n.translate('xpack.maps.vectorLayer.joinError.firstTenMsg', {
              defaultMessage: ` (5 of {total})`,
              values: { total: array.length },
            });
    }

    const joinStatus = joinStatusesWithoutAnyMatches[0];
    const leftFieldName = await joinStatus.joinState.join.getLeftField().getLabel();
    const rightFieldName = await joinStatus.joinState.join
      .getRightJoinSource()
      .getTermField()
      .getLabel();
    const reason =
      joinStatus.keys.length === 0
        ? i18n.translate('xpack.maps.vectorLayer.joinError.noLeftFieldValuesMsg', {
            defaultMessage: `Left field: '{leftFieldName}', does not provide any values.`,
            values: { leftFieldName },
          })
        : i18n.translate('xpack.maps.vectorLayer.joinError.noMatchesMsg', {
            defaultMessage: `Left field does not match right field. Left field: '{leftFieldName}' has values { leftFieldValues }. Right field: '{rightFieldName}' has values: { rightFieldValues }.`,
            values: {
              leftFieldName,
              leftFieldValues: prettyPrintArray(joinStatus.keys),
              rightFieldName,
              rightFieldValues: prettyPrintArray(
                Array.from(joinStatus.joinState.propertiesMap!.keys())
              ),
            },
          });

    onJoinError(
      i18n.translate('xpack.maps.vectorLayer.joinErrorMsg', {
        defaultMessage: `Unable to perform term join. {reason}`,
        values: { reason },
      })
    );
  }
}
