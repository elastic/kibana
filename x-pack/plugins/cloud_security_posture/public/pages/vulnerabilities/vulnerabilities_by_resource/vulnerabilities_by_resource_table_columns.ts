/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn, EuiDataGridColumnCellAction } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const vulnerabilitiesByResourceColumns = {
  resourceId: 'resource.id',
  resourceName: 'resource.name',
  region: 'cloud.region',
  vulnerabilities_count: 'vulnerabilities_count',
  severity_map: 'severity_map',
};

const defaultColumnProps = (): Partial<EuiDataGridColumn> => ({
  isExpandable: false,
  actions: {
    showHide: false,
    showMoveLeft: false,
    showMoveRight: false,
    showSortAsc: false,
    showSortDesc: false,
  },
  isSortable: false,
});

export const getVulnerabilitiesByResourceColumnsGrid = (
  cellActions: EuiDataGridColumnCellAction[]
): EuiDataGridColumn[] => [
  {
    ...defaultColumnProps(),
    id: vulnerabilitiesByResourceColumns.resourceId,
    displayAsText: i18n.translate('xpack.csp.vulnerabilityByResourceTable.column.resourceId', {
      defaultMessage: 'Resource ID',
    }),
    cellActions,
  },
  {
    ...defaultColumnProps(),
    id: vulnerabilitiesByResourceColumns.resourceName,
    displayAsText: i18n.translate('xpack.csp.vulnerabilityByResourceTable.column.resourceName', {
      defaultMessage: 'Resource Name',
    }),
    cellActions,
  },
  {
    ...defaultColumnProps(),
    id: vulnerabilitiesByResourceColumns.region,
    displayAsText: i18n.translate('xpack.csp.vulnerabilityByResourceTable.column.region', {
      defaultMessage: 'Region',
    }),
    cellActions,
    initialWidth: 150,
  },
  {
    ...defaultColumnProps(),
    actions: {
      showHide: false,
      showMoveLeft: false,
      showMoveRight: false,
      showSortAsc: true,
      showSortDesc: true,
    },
    id: vulnerabilitiesByResourceColumns.vulnerabilities_count,
    displayAsText: i18n.translate('xpack.csp.vulnerabilityByResourceTable.column.vulnerabilities', {
      defaultMessage: 'Vulnerabilities',
    }),
    initialWidth: 140,
    isResizable: false,
    isSortable: true,
  },
  {
    ...defaultColumnProps(),
    id: vulnerabilitiesByResourceColumns.severity_map,
    displayAsText: i18n.translate('xpack.csp.vulnerabilityByResourceTable.column.severityMap', {
      defaultMessage: 'Severity Map',
    }),
    cellActions,
    initialWidth: 110,
    isResizable: false,
  },
];
