/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APM_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../../../common/constants';
import {
  INSTRUCTION_STEP_DISABLE_INTERNAL,
  INSTRUCTION_STEP_ENABLE_METRICBEAT,
} from '../constants';
import {
  getApmInstructionsForDisablingInternalCollection,
  getApmInstructionsForEnablingMetricbeat,
} from './apm';
import {
  getBeatsInstructionsForDisablingInternalCollection,
  getBeatsInstructionsForEnablingMetricbeat,
} from './beats';
import {
  getElasticsearchInstructionsForDisablingInternalCollection,
  getElasticsearchInstructionsForEnablingMetricbeat,
} from './elasticsearch';
import {
  getKibanaInstructionsForDisablingInternalCollection,
  getKibanaInstructionsForEnablingMetricbeat,
} from './kibana';
import {
  getLogstashInstructionsForDisablingInternalCollection,
  getLogstashInstructionsForEnablingMetricbeat,
} from './logstash';

export function getInstructionSteps(productName, product, step, meta, opts) {
  switch (productName) {
    case KIBANA_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getKibanaInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getKibanaInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case ELASTICSEARCH_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getElasticsearchInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getElasticsearchInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case LOGSTASH_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getLogstashInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getLogstashInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case BEATS_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getBeatsInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getBeatsInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case APM_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getApmInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getApmInstructionsForDisablingInternalCollection(product, meta, opts);
      }
  }
  return [];
}
