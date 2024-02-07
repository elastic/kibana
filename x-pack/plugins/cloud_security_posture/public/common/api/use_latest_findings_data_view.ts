/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
} from '../../../common/constants';
import { CspClientPluginStartDeps } from '../../types';

/**
 * TODO: Remove this static labels once https://github.com/elastic/kibana/issues/172615 is resolved
 */
const cloudSecurityFieldLabels: Record<string, string> = {
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
  'vulnerability.id': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.vulnerabilityIdColumnLabel',
    { defaultMessage: 'Vulnerability' }
  ),
  'vulnerability.score.base': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.vulnerabilityScoreColumnLabel',
    { defaultMessage: 'CVSS' }
  ),
  'vulnerability.severity': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.vulnerabilitySeverityColumnLabel',
    { defaultMessage: 'Severity' }
  ),
  'package.name': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.packageNameColumnLabel',
    { defaultMessage: 'Package' }
  ),
  'package.version': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.packageVersionColumnLabel',
    { defaultMessage: 'Version' }
  ),
  'package.fixed_version': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.packageFixedVersionColumnLabel',
    { defaultMessage: 'Fix Version' }
  ),
} as const;

/**
 *  TODO: use perfected kibana data views
 */
export const useLatestFindingsDataView = (dataView: string) => {
  const {
    data: { dataViews },
  } = useKibana<CspClientPluginStartDeps>().services;

  const findDataView = async (): Promise<DataView> => {
    const [dataViewObj] = await dataViews.find(dataView);
    if (!dataViewObj) {
      throw new Error(`Data view not found [Name: {${dataView}}]`);
    }

    /**
     * TODO: Remove this update logic once https://github.com/elastic/kibana/issues/172615 is resolved
     */
    if (
      dataView === LATEST_FINDINGS_INDEX_PATTERN ||
      dataView === LATEST_VULNERABILITIES_INDEX_PATTERN
    ) {
      let shouldUpdate = false;
      Object.entries(cloudSecurityFieldLabels).forEach(([field, label]) => {
        if (
          !dataViewObj.getFieldAttrs()[field]?.customLabel ||
          dataViewObj.getFieldAttrs()[field]?.customLabel === field
        ) {
          dataViewObj.setFieldCustomLabel(field, label);
          shouldUpdate = true;
        }
      });
      if (shouldUpdate) {
        await dataViews.updateSavedObject(dataViewObj);
      }
    }

    return dataViewObj;
  };

  return useQuery([`useDataView-${dataView}`], findDataView);
};
