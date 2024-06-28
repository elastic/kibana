/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  REFERENCES_FIELD_LABEL,
  RISK_SCORE_MAPPING_FIELD_LABEL,
  SEVERITY_MAPPING_FIELD_LABEL,
  THREAT_INDICATOR_PATH_LABEL,
  INDEX_FIELD_LABEL,
  DATA_VIEW_ID_FIELD_LABEL,
  THREAT_FIELD_LABEL,
  ANOMALY_THRESHOLD_FIELD_LABEL,
  MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
  THREAT_INDEX_FIELD_LABEL,
  THREAT_MAPPING_FIELD_LABEL,
  HISTORY_WINDOW_SIZE_FIELD_LABEL,
} from '../translations';

/**
 * Used when fields have different display names or formats than their corresponding rule object fields
 */
export const fieldToDisplayNameMap: Record<string, string> = {
  data_source: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.dataSourceLabel',
    {
      defaultMessage: 'Data source',
    }
  ),
  note: i18n.translate('xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.noteLabel', {
    defaultMessage: 'Investigation guide',
  }),
  severity_mapping: SEVERITY_MAPPING_FIELD_LABEL,
  risk_score_mapping: RISK_SCORE_MAPPING_FIELD_LABEL,
  references: REFERENCES_FIELD_LABEL,
  threat_indicator_path: THREAT_INDICATOR_PATH_LABEL,
  index_patterns: INDEX_FIELD_LABEL,
  data_view_id: DATA_VIEW_ID_FIELD_LABEL,
  threat: THREAT_FIELD_LABEL,
  eql_query: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.eqlQueryLabel',
    {
      defaultMessage: 'EQL query',
    }
  ),
  kql_query: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.kqlQueryLabel',
    {
      defaultMessage: 'KQL query',
    }
  ),
  threat_query: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.threatQueryLabel',
    {
      defaultMessage: 'Indicator index query',
    }
  ),
  esql_query: i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRuleFields.esqlQueryLabel',
    {
      defaultMessage: 'ESQL query',
    }
  ),
  anomaly_threshold: ANOMALY_THRESHOLD_FIELD_LABEL,
  machine_learning_job_id: MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
  threat_index: THREAT_INDEX_FIELD_LABEL,
  threat_mapping: THREAT_MAPPING_FIELD_LABEL,
  history_window_start: HISTORY_WINDOW_SIZE_FIELD_LABEL,
};
