/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { isEqlRule, isEqlSequenceQuery } from '../../../../../common/detection_engine/utils';

/**
 * transforms  DefineStepRule fields according to experimental feature flags
 */
export const useExperimentalFeatureFieldsTransform = <T extends Partial<DefineStepRule>>(): ((
  fields: T
) => T) => {
  const isAlertSuppressionForSequenceEqlRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForSequenceEqlRuleEnabled'
  );
  const transformer = useCallback(
    (fields: T) => {
      console.error('fields query bar', fields.queryBar?.query?.query);
      const isSuppressionDisabled =
        isEqlRule(fields.ruleType) &&
        isEqlSequenceQuery(fields.queryBar?.query?.query as string) &&
        !isAlertSuppressionForSequenceEqlRuleEnabled;

      // reset any alert suppression values hidden behind feature flag
      if (isSuppressionDisabled) {
        return {
          ...fields,
          groupByFields: [],
          groupByRadioSelection: undefined,
          groupByDuration: undefined,
          suppressionMissingFields: undefined,
        };
      }
      return fields;
    },
    [isAlertSuppressionForSequenceEqlRuleEnabled]
  );

  return transformer;
};
