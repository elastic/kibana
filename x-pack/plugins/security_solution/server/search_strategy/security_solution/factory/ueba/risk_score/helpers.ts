/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash/fp';
import { RiskScoreHit, RiskScoreEdges } from '../../../../../../common';
import { set } from '../../../../../../../../../../../../../private/var/tmp/_bazel_stephmilovic/f2692a3f20a774c59f0da1de1e889609/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/elastic-safer-lodash-set/fp';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';
import { riskScoreFieldsMap } from '../../../../../../common/ecs/ecs_fields';

export const RISK_SCORE_FIELDS: readonly string[] = ['_id'];

export const formatRiskScoreData = (
  fields: readonly string[] = RISK_SCORE_FIELDS,
  bucket: RiskScoreHit
): RiskScoreEdges => {
  console.log('formatRiskScoreData', { fields, bucket });
  return fields.reduce<RiskScoreEdges>(
    (flattenedFields, fieldName) => {
      const riskScoreId = get('key', bucket);
      flattenedFields.node._id = riskScoreId || null;
      flattenedFields.cursor.value = riskScoreId || '';
      const fieldValue = getRiskScoreFieldValue(fieldName, bucket);
      if (fieldValue != null) {
        return set(
          `node.${fieldName}`,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          flattenedFields
        );
      }
      return flattenedFields;
    },
    {
      node: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as RiskScoreEdges
  );
};

const getRiskScoreFieldValue = (
  fieldName: string,
  bucket: RiskScoreHit
): string | string[] | null => {
  const aggField = riskScoreFieldsMap[fieldName]
    ? riskScoreFieldsMap[fieldName].replace(/\./g, '_')
    : fieldName.replace(/\./g, '_');
  if (
    ['risk.score', 'risk_score', 'risk.keyword', 'host.name'].includes(fieldName) &&
    has(aggField, bucket)
  ) {
    return get('risk_score.value', bucket) || null;
  }
  return null;
};
