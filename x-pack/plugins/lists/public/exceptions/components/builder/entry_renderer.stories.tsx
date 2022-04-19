/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { HttpStart } from '@kbn/core/public';
import {
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import type { AutocompleteStart } from '@kbn/data-plugin/public';
import { fields } from '@kbn/data-plugin/common/mocks';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { BuilderEntryItem, EntryItemProps } from './entry_renderer';

const mockAutocompleteService = {
  getValueSuggestions: () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            field: {
              aggregatable: true,
              count: 30,
              esTypes: ['date'],
              name: '@timestamp',
              readFromDocValues: true,
              scripted: false,
              searchable: true,
              type: 'date',
            },
            type: 'field',
          },
          {
            field: {
              aggregatable: true,
              count: 0,
              esTypes: ['ip'],
              name: 'ip',
              readFromDocValues: true,
              scripted: false,
              searchable: true,
              type: 'ip',
            },
            type: 'field',
          },
        ]);
      }, 300);
    }),
} as unknown as AutocompleteStart;

export default {
  argTypes: {
    allowLargeValueLists: {
      control: {
        type: 'boolean',
      },
      description: '`boolean` - set to true to allow large value lists.',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: false,
      },
    },
    autoCompleteService: {
      control: {
        type: 'object',
      },
      description:
        '`AutocompleteStart` - Kibana data plugin autocomplete service used for field value autocomplete.',
      type: {
        required: true,
      },
    },
    entry: {
      control: {
        type: 'object',
      },
      description: '`FormattedBuilderEntry` - A single exception item entry.',
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
    indexPattern: {
      description:
        '`DataViewBase` - index patterns used to populate field options and value autocomplete.',
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

    onChange: {
      description:
        '`(arg: BuilderEntry, i: number) => void` - callback invoked any time field, operator or value is updated.',
      type: {
        required: true,
      },
    },
    onlyShowListOperators: {
      description:
        '`boolean` - set to true to display to user only operators related to large value lists. This is currently used due to limitations around combining large value list exceptions and non-large value list exceptions.',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: false,
      },
    },
    setErrorsExist: {
      description: '`(arg: boolean) => void` - callback invoked to bubble up input errors.',
      type: {
        required: true,
      },
    },
    showLabel: {
      description:
        '`boolean` - whether or not to show the input labels (normally just wanted for the first entry item).',
      table: {
        defaultValue: {
          summary: false,
        },
      },
      type: {
        required: false,
      },
    },
  },
  component: BuilderEntryItem,
  decorators: [
    (DecoratorStory: React.ComponentClass): React.ReactNode => (
      <EuiThemeProvider>
        <DecoratorStory />
      </EuiThemeProvider>
    ),
  ],
  title: 'BuilderEntryItem',
};

const BuilderEntryItemTemplate: Story<EntryItemProps> = (args) => <BuilderEntryItem {...args} />;

export const Default = BuilderEntryItemTemplate.bind({});
Default.args = {
  autocompleteService: mockAutocompleteService,

  entry: {
    correspondingKeywordField: undefined,
    entryIndex: 0,
    field: undefined,
    id: 'e37ad550-05d2-470e-9a95-487db201ab56',
    nested: undefined,
    operator: {
      message: 'is',
      operator: OperatorEnum.INCLUDED,
      type: OperatorTypeEnum.MATCH,
      value: 'is',
    },
    parent: undefined,
    value: '',
  },
  httpService: {} as HttpStart,
  indexPattern: {
    fields,
    id: '1234',
    title: 'logstash-*',
  },
  listType: 'detection',
  onChange: action('onClick'),
  onlyShowListOperators: false,
  setErrorsExist: action('onClick'),
  showLabel: false,
};
