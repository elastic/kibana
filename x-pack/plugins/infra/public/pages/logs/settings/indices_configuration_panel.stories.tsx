/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPageContent, PropsOf } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import {
  MockIndexPattern,
  MockIndexPatternsKibanaContextProvider,
} from '../../../hooks/use_kibana_index_patterns.mock';
import {
  LogIndicesConfigurationFormState,
  useLogIndicesConfigurationFormState,
} from './indices_configuration_form_state';
import { IndicesConfigurationPanel } from './indices_configuration_panel';

export default {
  title: 'infra/logsSettings/indicesConfiguration',
  decorators: [
    (wrappedStory, { args }) => (
      <I18nProvider>
        <EuiThemeProvider>
          <MockIndexPatternsKibanaContextProvider
            asyncDelay={5}
            mockIndexPatterns={args.indexPatterns}
          >
            <EuiPage restrictWidth>
              <EuiPageBody>
                <EuiPageContent>{wrappedStory()}</EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </MockIndexPatternsKibanaContextProvider>
        </EuiThemeProvider>
      </I18nProvider>
    ),
  ],
  argTypes: {
    logIndices: {
      control: {
        type: 'object',
      },
    },
    indexPatterns: {
      control: {
        type: 'object',
      },
    },
  },
} as Meta;

type IndicesConfigurationPanelProps = PropsOf<typeof IndicesConfigurationPanel>;

const IndicesConfigurationPanelTemplate: Story<
  Pick<IndicesConfigurationPanelProps, 'isLoading' | 'isReadOnly'> &
    LogIndicesConfigurationFormState
> = ({ isLoading, isReadOnly, ...initialFormState }) => {
  const indicesConfigurationFormState = useLogIndicesConfigurationFormState({
    initialFormState,
  });

  return (
    <IndicesConfigurationPanel
      isLoading={isLoading}
      isReadOnly={isReadOnly}
      indicesFormElementProps={indicesConfigurationFormState.fieldProps.logIndices}
      tiebreakerFieldFormElementProps={indicesConfigurationFormState.fieldProps.tiebreakerField}
      timestampFieldFormElementProps={indicesConfigurationFormState.fieldProps.timestampField}
    />
  );
};

const defaultArgs = {
  description: '',
  isLoading: false,
  isReadOnly: false,
  logIndices: {
    type: 'index-name' as const,
    indexName: 'logs-*',
  },
  name: 'My log source configuration',
  tiebreakerField: '_doc',
  timestampField: '@timestamp',
  indexPatterns: [
    {
      id: 'INDEX_PATTERN_A',
      title: 'pattern-a-*',
    },
    {
      id: 'INDEX_PATTERN_B',
      title: 'pattern-b-*',
    },
  ],
};

export const IndexNameWithDefaultFields = IndicesConfigurationPanelTemplate.bind({});

IndexNameWithDefaultFields.args = {
  ...defaultArgs,
};

export const IndexPattern = IndicesConfigurationPanelTemplate.bind({});

IndexPattern.args = {
  ...defaultArgs,
  logIndices: {
    type: 'index-pattern',
    indexPattern: '',
  },
};
