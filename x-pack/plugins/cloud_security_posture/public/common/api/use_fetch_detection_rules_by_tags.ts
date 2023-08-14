/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { fetchDetectionEngineRulesByTags } from '../../../common/api';

const DETECTION_ENGINE_RULES_KEY = 'detection_engine_rules';

export const useFetchDetectionRulesByTags = (tags: string[]) => {
  const { http } = useKibana().services;

  if (!http) {
    throw new Error('Kibana http service is not available');
  }

  return useQuery([DETECTION_ENGINE_RULES_KEY, tags], () =>
    fetchDetectionEngineRulesByTags({ http, tags })
  );
};
