/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  AGG_DELIMITER,
  AGG_TYPE,
  FIELD_ORIGIN,
  JOIN_FIELD_NAME_PREFIX,
  LAYER_TYPE,
  VECTOR_STYLES,
} from '../constants';
import { getJoinAggKey } from '../get_agg_key';
import {
  AggDescriptor,
  JoinDescriptor,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../descriptor_types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

const GROUP_BY_DELIMITER = '_groupby_';

function getLegacyAggKey({
  aggType,
  aggFieldName,
  indexPatternTitle,
  termFieldName,
}: {
  aggType: AGG_TYPE;
  aggFieldName?: string;
  indexPatternTitle: string;
  termFieldName: string;
}): string {
  const metricKey =
    aggType !== AGG_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${aggFieldName}` : aggType;
  return `${JOIN_FIELD_NAME_PREFIX}${metricKey}${GROUP_BY_DELIMITER}${indexPatternTitle}.${termFieldName}`;
}

function parseLegacyAggKey(legacyAggKey: string): { aggType: AGG_TYPE; aggFieldName?: string } {
  const groupBySplit = legacyAggKey
    .substring(JOIN_FIELD_NAME_PREFIX.length)
    .split(GROUP_BY_DELIMITER);
  const metricKey = groupBySplit[0];
  const metricKeySplit = metricKey.split(AGG_DELIMITER);
  return {
    aggType: metricKeySplit[0] as AGG_TYPE,
    aggFieldName: metricKeySplit.length === 2 ? metricKeySplit[1] : undefined,
  };
}

export function migrateJoinAggKey({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (
      layerDescriptor.type === LAYER_TYPE.VECTOR ||
      layerDescriptor.type === LAYER_TYPE.BLENDED_VECTOR
    ) {
      const vectorLayerDescriptor = layerDescriptor as VectorLayerDescriptor;

      if (
        !vectorLayerDescriptor.style ||
        !vectorLayerDescriptor.joins ||
        vectorLayerDescriptor.joins.length === 0
      ) {
        return;
      }

      const legacyJoinFields = new Map<string, JoinDescriptor>();
      vectorLayerDescriptor.joins.forEach((joinDescriptor: JoinDescriptor) => {
        _.get(joinDescriptor, 'right.metrics', []).forEach((aggDescriptor: AggDescriptor) => {
          const legacyAggKey = getLegacyAggKey({
            aggType: aggDescriptor.type,
            aggFieldName: aggDescriptor.field,
            indexPatternTitle: _.get(joinDescriptor, 'right.indexPatternTitle', ''),
            termFieldName: _.get(joinDescriptor, 'right.term', ''),
          });
          // The legacy getAggKey implemenation has a naming collision bug where
          // aggType, aggFieldName, indexPatternTitle, and termFieldName would result in the identical aggKey.
          // The VectorStyle implemenation used the first matching join descriptor
          // so, in the event of a name collision, the first join descriptor will be used here as well.
          if (!legacyJoinFields.has(legacyAggKey)) {
            legacyJoinFields.set(legacyAggKey, joinDescriptor);
          }
        });
      });

      Object.keys(vectorLayerDescriptor.style.properties).forEach((key) => {
        const style: any = vectorLayerDescriptor.style!.properties[key as VECTOR_STYLES];
        if (_.get(style, 'options.field.origin') === FIELD_ORIGIN.JOIN) {
          const joinDescriptor = legacyJoinFields.get(style.options.field.name);
          if (joinDescriptor) {
            const { aggType, aggFieldName } = parseLegacyAggKey(style.options.field.name);
            // Update legacy join agg key to new join agg key
            style.options.field.name = getJoinAggKey({
              aggType,
              aggFieldName,
              rightSourceId: joinDescriptor.right.id!,
            });
          }
        }
      });
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
