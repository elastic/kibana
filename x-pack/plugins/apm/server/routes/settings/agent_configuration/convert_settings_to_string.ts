/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@kbn/core/types/elasticsearch';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';

// needed for backwards compatability
// All settings except `transaction_sample_rate` and `transaction_max_spans` are stored as strings (they are stored as float and integer respectively)
export function convertConfigSettingsToString(
  hit: SearchHit<AgentConfiguration>
) {
  const config = hit._source;

  if (config.settings?.transaction_sample_rate) {
    config.settings.transaction_sample_rate =
      config.settings.transaction_sample_rate.toString();
  }

  if (config.settings?.transaction_max_spans) {
    config.settings.transaction_max_spans =
      config.settings.transaction_max_spans.toString();
  }

  return hit;
}
