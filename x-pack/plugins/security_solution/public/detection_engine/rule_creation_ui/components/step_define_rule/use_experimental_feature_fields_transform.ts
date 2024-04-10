/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { isNewTermsRule } from '../../../../../common/detection_engine/utils';

/**
 * transforms  DefineStepRule fields according to experimental feature flags
 */
export const useExperimentalFeatureFieldsTransform = <T extends Partial<DefineStepRule>>(): ((
  fields: T
) => T) => {
  const isAlertSuppressionForNewTermsRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForNewTermsRuleEnabled'
  );

  const transformer = useCallback(
    (fields: T) => {
      const isNewTermsSuppressionDisabled = isNewTermsRule(fields.ruleType)
        ? !isAlertSuppressionForNewTermsRuleEnabled
        : false;

      // reset any alert suppression values hidden behind feature flag
      if (isNewTermsSuppressionDisabled) {
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
    [isAlertSuppressionForNewTermsRuleEnabled]
  );

  return transformer;
};
