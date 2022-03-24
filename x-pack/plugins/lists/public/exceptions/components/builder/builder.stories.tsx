/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story, addDecorator } from '@storybook/react';
import React from 'react';
import { HttpStart } from 'kibana/public';

import type { AutocompleteStart } from '../../../../../../../src/plugins/data/public';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { fields, getField } from '../../../../../../../src/plugins/data/common/mocks';
import { getEntryMatchAnyMock } from '../../../../common/schemas/types/entry_match_any.mock';
import { getEntryMatchMock } from '../../../../common/schemas/types/entry_match.mock';
import { getEntryExistsMock } from '../../../../common/schemas/types/entry_exists.mock';
import { getEntryNestedMock } from '../../../../common/schemas/types/entry_nested.mock';
import { getExceptionListItemSchemaMock } from '../../../../common/schemas/response/exception_list_item_schema.mock';

import {
  ExceptionBuilderComponent,
  ExceptionBuilderProps,
  OnChangeProps,
} from './exception_items_renderer';

const mockHttpService: HttpStart = {
  addLoadingCountSource: (): void => {},
  anonymousPaths: {
    isAnonymous: (): void => {},
    register: (): void => {},
  },
  basePath: {},
  delete: (): void => {},
  externalUrl: {
    validateUrl: (): void => {},
  },
  fetch: (): void => {},
  get: (): void => {},
  getLoadingCount$: (): void => {},
  head: (): void => {},
  intercept: (): void => {},
  options: (): void => {},
  patch: (): void => {},
  post: (): void => {},
  put: (): void => {},
} as unknown as HttpStart;
const mockAutocompleteService = {
  getValueSuggestions: () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          'siem-kibana',
          'win2019-endpoint-mr-pedro',
          'rock01',
          'windows-endpoint',
          'siem-windows',
          'mothra',
        ]);
      }, 300);
    }),
} as unknown as AutocompleteStart;

addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>);

export default {
  argTypes: {
    allowLargeValueLists: {
      control: {
        type: 'boolean',
      },
      description: '`boolean` - set to true to allow large value lists.',
      table: {
        defaultValue: {
          summary: true,
        },
      },
      type: {
        required: true,
      },
    },
    autocompleteService: {
      control: {
        type: 'object',
      },
      description:
        '`AutocompleteStart` - Kibana data plugin autocomplete service used for field value autocomplete.',
      type: {
        required: true,
      },
    },
    exceptionListItems: {
      control: {
        type: 'array',
      },
      description:
        '`ExceptionsBuilderExceptionItem[]` - Any existing exception items - would be populated when editing an exception item.',
      type: {
        required: true,
      },
    },
    httpService: {
      control: {
        type: 'object',
      },
      description: '`HttpStart` - Kibana service.',
      type: {
        required: true,
      },
    },
    indexPatterns: {
      description:
        '`DataViewBase` - index patterns used to populate field options and value autocomplete.',
      type: {
        required: true,
      },
    },
    isAndDisabled: {
      control: {
        type: 'boolean',
      },
      description:
        '`boolean` - set to true to disallow users from using the `AND` button to add entries.',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: true,
      },
    },
    isNestedDisabled: {
      control: {
        type: 'boolean',
      },
      description:
        '`boolean` - set to true to disallow users from using the `Add nested` button to add nested entries.',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: true,
      },
    },
    isOrDisabled: {
      control: {
        type: 'boolean',
      },
      description:
        '`boolean` - set to true to disallow users from using the `OR` button to add multiple exception items within the builder.',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: true,
      },
    },
    listId: {
      control: {
        type: 'string',
      },
      description: '`string` - the exception list id.',
      type: {
        required: true,
      },
    },
    listNamespaceType: {
      control: {
        options: ['agnostic', 'single'],
        type: 'select',
      },
      description: '`NamespaceType` - Determines whether the list is global or space specific.',
      type: {
        required: true,
      },
    },
    listType: {
      control: {
        options: ['detection', 'endpoint'],
        type: 'select',
      },
      description:
        '`ExceptionListType` - Depending on the list type, certain validations may apply.',
      type: {
        required: true,
      },
    },
    listTypeSpecificIndexPatternFilter: {
      description:
        '`(pattern: DataViewBase, type: ExceptionListType) => DataViewBase` - callback invoked when index patterns filtered. Optional to be used if you would only like certain fields displayed.',
      type: {
        required: false,
      },
    },
    onChange: {
      description:
        '`(arg: OnChangeProps) => void` - callback invoked any time builder update to propagate changes up to parent.',
      type: {
        required: true,
      },
    },
    ruleName: {
      description: '`string` - name of the rule list is associated with.',
      type: {
        required: true,
      },
    },
  },
  component: ExceptionBuilderComponent,
  title: 'ExceptionBuilderComponent',
};

const BuilderTemplate: Story<ExceptionBuilderProps> = (args) => (
  <ExceptionBuilderComponent {...args} />
);

export const Default = BuilderTemplate.bind({});
Default.args = {
  allowLargeValueLists: true,
  autocompleteService: mockAutocompleteService,
  exceptionListItems: [],
  httpService: mockHttpService,
  indexPatterns: { fields, id: '1234', title: 'logstash-*' },
  isAndDisabled: false,
  isNestedDisabled: false,
  isOrDisabled: false,
  listId: '1234',
  listNamespaceType: 'single',
  listType: 'detection',
  onChange: (): OnChangeProps => ({
    errorExists: false,
    exceptionItems: [],
    exceptionsToDelete: [],
    warningExists: false,
  }),
  ruleName: 'My awesome rule',
};

const sampleExceptionItem = {
  ...getExceptionListItemSchemaMock(),
  entries: [
    { ...getEntryMatchAnyMock(), field: getField('ip').name, value: ['some ip'] },
    { ...getEntryMatchMock(), field: getField('ssl').name, value: 'false' },
    { ...getEntryExistsMock(), field: getField('@timestamp').name },
  ],
};

const sampleNestedExceptionItem = {
  ...getExceptionListItemSchemaMock(),
  entries: [
    { ...getEntryMatchAnyMock(), field: getField('ip').name, value: ['some ip'] },
    {
      ...getEntryNestedMock(),
      entries: [
        {
          ...getEntryMatchMock(),
          field: 'child',
          value: 'some nested value',
        },
      ],
      field: 'nestedField',
    },
  ],
};

const BuilderSingleExceptionItem: Story<ExceptionBuilderProps> = (args) => (
  <ExceptionBuilderComponent {...args} />
);

export const SingleExceptionItem = BuilderSingleExceptionItem.bind({});
SingleExceptionItem.args = {
  allowLargeValueLists: true,
  autocompleteService: mockAutocompleteService,
  exceptionListItems: [sampleExceptionItem],
  httpService: mockHttpService,
  indexPatterns: { fields, id: '1234', title: 'logstash-*' },
  isAndDisabled: false,
  isNestedDisabled: false,
  isOrDisabled: false,
  listId: '1234',
  listNamespaceType: 'single',
  listType: 'detection',
  onChange: (): OnChangeProps => ({
    errorExists: false,
    exceptionItems: [sampleExceptionItem],
    exceptionsToDelete: [],
    warningExists: false,
  }),
  ruleName: 'My awesome rule',
};

const BuilderMultiExceptionItems: Story<ExceptionBuilderProps> = (args) => (
  <ExceptionBuilderComponent {...args} />
);

export const MultiExceptionItems = BuilderMultiExceptionItems.bind({});
MultiExceptionItems.args = {
  allowLargeValueLists: true,
  autocompleteService: mockAutocompleteService,
  exceptionListItems: [sampleExceptionItem, sampleExceptionItem],
  httpService: mockHttpService,
  indexPatterns: { fields, id: '1234', title: 'logstash-*' },
  isAndDisabled: false,
  isNestedDisabled: false,
  isOrDisabled: false,
  listId: '1234',
  listNamespaceType: 'single',
  listType: 'detection',
  onChange: (): OnChangeProps => ({
    errorExists: false,
    exceptionItems: [sampleExceptionItem, sampleExceptionItem],
    exceptionsToDelete: [],
    warningExists: false,
  }),
  ruleName: 'My awesome rule',
};

const BuilderWithNested: Story<ExceptionBuilderProps> = (args) => (
  <ExceptionBuilderComponent {...args} />
);

export const WithNestedExceptionItem = BuilderWithNested.bind({});
WithNestedExceptionItem.args = {
  allowLargeValueLists: true,
  autocompleteService: mockAutocompleteService,
  exceptionListItems: [sampleNestedExceptionItem, sampleExceptionItem],
  httpService: mockHttpService,
  indexPatterns: { fields, id: '1234', title: 'logstash-*' },
  isAndDisabled: false,
  isNestedDisabled: false,
  isOrDisabled: false,
  listId: '1234',
  listNamespaceType: 'single',
  listType: 'detection',
  onChange: (): OnChangeProps => ({
    errorExists: false,
    exceptionItems: [sampleNestedExceptionItem, sampleExceptionItem],
    exceptionsToDelete: [],
    warningExists: false,
  }),
  ruleName: 'My awesome rule',
};
