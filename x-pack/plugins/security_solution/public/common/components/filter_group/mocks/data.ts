/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const sampleOutputData = {
  loading: false,
  rendered: true,
  dataViewIds: ['security-solution-default'],
  embeddableLoaded: {
    '0': true,
    '1': true,
    '2': true,
    '3': true,
    '4': true,
  },
  filters: [
    {
      meta: {
        index: 'security-solution-default',
        key: 'kibana.alert.building_block_type',
        negate: true,
      },
      query: {
        exists: {
          field: 'kibana.alert.building_block_type',
        },
      },
    },
  ],
};

export const initialInputData = {
  viewMode: 'view',
  id: 'f9e81d5a-f6ab-4179-866d-c029554131be',
  panels: {
    '0': {
      type: 'optionsListControl',
      order: 0,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '0',
        dataViewId: 'security-solution-default',
        fieldName: 'kibana.alert.workflow_status',
        title: 'Status',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
    '1': {
      type: 'optionsListControl',
      order: 1,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '1',
        dataViewId: 'security-solution-default',
        fieldName: 'kibana.alert.severity',
        title: 'Severity',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
    '2': {
      type: 'optionsListControl',
      order: 2,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '2',
        dataViewId: 'security-solution-default',
        fieldName: 'kibana.alert.building_block_type',
        title: 'Bulding Block',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        selectedOptions: [],
        existsSelected: true,
        exclude: true,
      },
    },
    '3': {
      type: 'optionsListControl',
      order: 3,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '3',
        dataViewId: 'security-solution-default',
        fieldName: 'user.name',
        title: 'User',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
    '4': {
      type: 'optionsListControl',
      order: 4,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '4',
        dataViewId: 'security-solution-default',
        fieldName: 'host.name',
        title: 'Host',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
  },
  defaultControlWidth: 'small',
  defaultControlGrow: true,
  controlStyle: 'oneLine',
  chainingSystem: 'HIERARCHICAL',
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
  timeRange: {
    from: '2007-04-20T14:00:52.236Z',
    to: '2023-04-20T21:59:59.999Z',
    mode: 'absolute',
  },
  filters: [],
  query: {
    query: '',
    language: 'kuery',
  },
};
