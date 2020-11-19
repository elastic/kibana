/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchHit } from '../../../../../../typings/elasticsearch';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';

// needed for backwards compatability
// All settings except `transaction_sample_rate` and `transaction_max_spans` are stored as strings (they are stored as float and integer respectively)
export function convertConfigSettingsToString(
  hit: ESSearchHit<AgentConfiguration>
) {
  const config = hit._source;

  if (config.settings?.transaction_sample_rate) {
    config.settings.transaction_sample_rate = config.settings.transaction_sample_rate.toString();
  }

  if (config.settings?.transaction_max_spans) {
    config.settings.transaction_max_spans = config.settings.transaction_max_spans.toString();
  }

  return hit;
}
