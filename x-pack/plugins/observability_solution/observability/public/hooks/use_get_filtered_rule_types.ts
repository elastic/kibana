/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ES_QUERY_ID, ML_ANOMALY_DETECTION_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { usePluginContext } from './use_plugin_context';

export function useGetFilteredRuleTypes() {
  const { observabilityRuleTypeRegistry } = usePluginContext();

  return useMemo(() => {
    return [
      ES_QUERY_ID,
      ML_ANOMALY_DETECTION_RULE_TYPE_ID,
      ...observabilityRuleTypeRegistry.list(),
    ];
  }, [observabilityRuleTypeRegistry]);
}
