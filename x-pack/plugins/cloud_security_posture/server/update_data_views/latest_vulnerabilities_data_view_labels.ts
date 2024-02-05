/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const latestVulnerabilitiesDataViewLabels = {
  'resource.id': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.resourceIdColumnLabel',
    { defaultMessage: 'Resource ID' }
  ),
  'resource.name': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.resourceNameColumnLabel',
    { defaultMessage: 'Resource Name' }
  ),
  'vulnerability.id': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.vulnerabilityIdColumnLabel',
    { defaultMessage: 'Vulnerability' }
  ),
  'vulnerability.score.base': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.vulnerabilityScoreColumnLabel',
    { defaultMessage: 'CVSS' }
  ),
  'vulnerability.severity': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.vulnerabilitySeverityColumnLabel',
    { defaultMessage: 'Severity' }
  ),
  'package.name': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.packageNameColumnLabel',
    { defaultMessage: 'Package' }
  ),
  'package.version': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.packageVersionColumnLabel',
    { defaultMessage: 'Version' }
  ),
  'package.fixed_version': i18n.translate(
    'xpack.csp.findings.findingsTable.vulnerabilitiesTableColumn.packageFixedVersionColumnLabel',
    { defaultMessage: 'Fix Version' }
  ),
};
