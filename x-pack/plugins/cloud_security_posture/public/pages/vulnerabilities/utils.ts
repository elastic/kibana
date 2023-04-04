/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';

export const getVulnerabilitiesColumns = (): EuiDataGridColumn[] => {
  return [
    {
      id: 'actions',
      initialWidth: 40,
      display: [],
      isSortable: false,
      isExpandable: false,
      actions: false,
      isResizable: false,
    },
    {
      id: 'vulnerability',
      displayAsText: 'Vulnerability',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
      initialWidth: 140,
    },
    {
      id: 'cvss',
      displayAsText: 'CVSS',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
      initialWidth: 84,
    },
    {
      id: 'resource',
      displayAsText: 'Resource',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'severity',
      displayAsText: 'Severity',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
      initialWidth: 100,
    },
    {
      id: 'package-version',
      displayAsText: 'Package and Version',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'fix-version',
      displayAsText: 'Fix Version',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
  ];
};
