/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { VectorScoreBase, Vector } from './types';

export const vulnerabilitiesColumns = {
  actions: 'actions',
  vulnerability: 'vulnerability',
  cvss: 'cvss',
  resource: 'resource',
  severity: 'severity',
  package_version: 'package_version',
  fix_version: 'fix_version',
};

const defaultColumnProps = () => ({
  isExpandable: false,
  actions: {
    showHide: false,
    showMoveLeft: false,
    showMoveRight: false,
  },
});

export const getVulnerabilitiesColumnsGrid = (): EuiDataGridColumn[] => {
  return [
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.actions,
      initialWidth: 40,
      display: [],
      actions: false,
      isSortable: false,
      isResizable: false,
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.vulnerability,
      displayAsText: i18n.translate('xpack.csp.vulnerabilityTable.column.vulnerability', {
        defaultMessage: 'Vulnerability',
      }),
      initialWidth: 150,
      isResizable: false,
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.cvss,
      displayAsText: 'CVSS',
      initialWidth: 84,
      isResizable: false,
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.resource,
      displayAsText: i18n.translate('xpack.csp.vulnerabilityTable.column.resource', {
        defaultMessage: 'Resource',
      }),
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.severity,
      displayAsText: i18n.translate('xpack.csp.vulnerabilityTable.column.severity', {
        defaultMessage: 'Severity',
      }),
      initialWidth: 100,
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.package_version,
      displayAsText: i18n.translate('xpack.csp.vulnerabilityTable.column.packageAndVersion', {
        defaultMessage: 'Package and Version',
      }),
    },
    {
      ...defaultColumnProps(),
      id: vulnerabilitiesColumns.fix_version,
      displayAsText: i18n.translate('xpack.csp.vulnerabilityTable.column.fixVersion', {
        defaultMessage: 'Fix Version',
      }),
    },
  ];
};

export const getVectorScoreList = (vectorBaseScore: VectorScoreBase) => {
  const result: Vector[] = [];
  const v2Vector = vectorBaseScore?.V2Vector;
  const v2Score = vectorBaseScore?.V2Score;
  const v3Vector = vectorBaseScore?.V3Vector;
  const v3Score = vectorBaseScore?.V3Score;

  if (v2Vector) {
    result.push({
      version: '2.0',
      vector: v2Vector,
      score: v2Score,
    });
  }

  if (v3Vector) {
    result.push({
      version: '2.0',
      vector: v3Vector,
      score: v3Score,
    });
  }

  return result;
};
