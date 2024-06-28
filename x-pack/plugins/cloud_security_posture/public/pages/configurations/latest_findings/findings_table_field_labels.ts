/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const findingsTableFieldLabels: Record<string, string> = {
  'result.evaluation': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resultColumnLabel',
    { defaultMessage: 'Result' }
  ),
  'resource.id': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnLabel',
    { defaultMessage: 'Resource ID' }
  ),
  'resource.name': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceNameColumnLabel',
    { defaultMessage: 'Resource Name' }
  ),
  'resource.sub_type': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceTypeColumnLabel',
    { defaultMessage: 'Resource Type' }
  ),
  'rule.benchmark.rule_number': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleNumberColumnLabel',
    { defaultMessage: 'Rule Number' }
  ),
  'rule.name': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleNameColumnLabel',
    { defaultMessage: 'Rule Name' }
  ),
  'rule.section': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleSectionColumnLabel',
    { defaultMessage: 'CIS Section' }
  ),
  '@timestamp': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.lastCheckedColumnLabel',
    { defaultMessage: 'Last Checked' }
  ),
} as const;
