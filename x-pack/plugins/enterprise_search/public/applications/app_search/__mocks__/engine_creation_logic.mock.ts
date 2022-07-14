/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchIndexSelectableOption } from '../components/engine_creation/search_index_selectable';
import { EngineCreationSteps } from '../components/engine_creation/engine_creation_logic';
import { removeWhitespace } from '../components/engine_creation/utils';

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
  isAliasAllowed: true,
  isAliasRequired: false,
  currentEngineCreationStep: EngineCreationSteps.SelectStep,
};

export const mockElasticsearchIndices = [
  {
    health: 'yellow',
    status: 'open',
    name: 'search-my-index-1',
    uuid: 'ydlR_QQJTeyZP66tzQSmMQ',
    alias: false,
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
    health: 'green',
    status: 'open',
    name: 'my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: false,
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
    aliases: ['search-my-index-2', 'alias-my-index-2'],
  },
  {
    health: 'green',
    status: 'open',
    name: 'search-my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: true,
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
    aliases: ['search-my-index-2', 'alias-my-index-2'],
  },
  {
    health: 'green',
    status: 'open',
    name: 'alias-my-index-2',
    uuid: '4dlR_QQJTe2ZP6qtzQSmMQ',
    alias: true,
    total: {
      docs: {
        count: 100,
        deleted: 0,
      },
      store: {
        size_in_bytes: '225b',
      },
    },
    aliases: ['search-my-index-2', 'alias-my-index-2'],
  },
];

export const mockSearchIndexOptions: SearchIndexSelectableOption[] = [
  {
    label: 'search-my-index-1',
    health: 'yellow',
    status: 'open',
    alias: false,
    disabled: false,
    badge: {
      color: 'success',
      label: 'Index',
      toolTipTitle: 'Index name conforms to pattern',
      toolTipContent: 'There is no need to specify an alias, but it is still allowed.',
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
    label: 'my-index-2',
    health: 'green',
    status: 'open',
    alias: false,
    disabled: false,
    badge: {
      color: 'warning',
      label: 'Index',
      icon: 'iInCircle',
      toolTipTitle: 'Index name does not conform to pattern',
      toolTipContent: removeWhitespace(`
        Choosing this index will require specifying an alias prefixed with
        'search-' in the Alias input below.
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
    label: 'search-my-index-2',
    health: 'green',
    status: 'open',
    alias: true,
    disabled: false,
    badge: {
      color: 'success',
      label: 'Alias',
      toolTipTitle: 'Alias name conforms to pattern',
      toolTipContent: removeWhitespace(`
        Aliases cannot be created for other aliases. Choosing this alias will
        disable the Alias input below.
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
    label: 'alias-my-index-2',
    health: 'green',
    status: 'open',
    alias: true,
    disabled: true,
    badge: {
      color: 'danger',
      label: 'Alias',
      icon: 'alert',
      toolTipTitle: 'Alias name does not conform to pattern',
      toolTipContent: removeWhitespace(`
        This alias is incompatible with Enterprise Search. Please choose
        another index or alias.
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
];
