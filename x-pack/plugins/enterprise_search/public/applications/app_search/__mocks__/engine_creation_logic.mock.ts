/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import { ElasticsearchIndexWithPrivileges } from '../../../../common/types/indices';

import { EngineCreationSteps } from '../components/engine_creation/engine_creation_logic';
import { SearchIndexSelectableOption } from '../components/engine_creation/search_index_selectable';

export const DEFAULT_VALUES = {
  ingestionMethod: '',
  isLoading: false,
  name: '',
  rawName: '',
  language: 'Universal',
  isLoadingIndices: false,
  indices: [],
  indicesFormatted: [],
  selectedIndex: '',
  engineType: 'appSearch',
  isSubmitDisabled: true,
  aliasName: '',
  aliasRawName: '',
  isAliasAllowed: true,
  isAliasRequired: false,
  currentEngineCreationStep: EngineCreationSteps.SelectStep,
  aliasNameErrorMessage: '',
  showAliasNameErrorMessages: false,
  selectedIndexFormatted: undefined,
};

export const mockElasticsearchIndices: ElasticsearchIndexWithPrivileges[] = [
  {
    count: 0,
    health: 'yellow',
    hidden: false,
    status: 'open',
    name: 'search-my-index-1',
    uuid: 'ydlR_QQJTeyZP66tzQSmMQ',
    alias: false,
    privileges: { read: true, manage: true },
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: false,
    privileges: { read: true, manage: true },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'search-my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: true,
    privileges: { read: true, manage: true },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'alias-my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: true,
    privileges: { read: true, manage: true },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'index-without-read-privilege',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: false,
    privileges: { read: false, manage: true },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'index-without-manage-privilege',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: false,
    privileges: { read: true, manage: false },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    health: 'green',
    hidden: false,
    status: 'open',
    name: 'alias-without-manage-privilege',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: true,
    privileges: { read: true, manage: false },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
];

export const mockSearchIndexOptions: SearchIndexSelectableOption[] = [
  {
    count: 0,
    label: 'search-my-index-1',
    health: 'yellow',
    status: 'open',
    alias: false,
    disabled: false,
    badge: {
      color: 'success',
      label: 'Index',
      toolTipTitle: 'Index name is compatible',
      toolTipContent: dedent(`
        You can directly use this index. You can also optionally create an
        alias to use as the source of the engine instead.
      `),
    },
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    label: 'my-index-2',
    health: 'green',
    status: 'open',
    alias: false,
    disabled: false,
    badge: {
      color: 'warning',
      label: 'Index',
      icon: 'iInCircle',
      toolTipTitle: 'Index name is incompatible',
      toolTipContent: dedent(`
        Enterprise Search will automatically create an alias to use as the
        source of the search engine rather than use this index directly.
      `),
    },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    label: 'search-my-index-2',
    health: 'green',
    status: 'open',
    alias: true,
    disabled: false,
    badge: {
      color: 'success',
      label: 'Alias',
      toolTipTitle: 'Alias is compatible',
      toolTipContent: 'You can use this alias.',
    },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
  {
    count: 100,
    label: 'alias-my-index-2',
    health: 'green',
    status: 'open',
    alias: true,
    disabled: true,
    badge: {
      color: 'danger',
      label: 'Alias',
      icon: 'alert',
      toolTipTitle: 'Alias name is incompatible',
      toolTipContent: 'You\'ll have to create a new alias prefixed with "search-".',
    },
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
  },
];
