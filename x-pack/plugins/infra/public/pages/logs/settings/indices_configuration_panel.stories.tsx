/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiPage, EuiPageBody, EuiPageContent, PropsOf } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';
import {
  MockIndexPatternsKibanaContextProvider,
  MockIndexPatternSpec,
} from '../../../hooks/use_kibana_index_patterns.mock';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { LogIndicesFormState, useLogIndicesFormElement } from './indices_configuration_form_state';
import { IndicesConfigurationPanel } from './indices_configuration_panel';

export default {
  title: 'infra/logsSettings/indicesConfiguration',
  decorators: [
    (WrappedStory, { args }) => {
      return (
        <I18nProvider>
          <MockIndexPatternsKibanaContextProvider
            asyncDelay={2000}
            mockIndexPatterns={args.availableIndexPatterns}
          >
            <EuiPage restrictWidth>
              <EuiPageBody>
                <EuiPageContent>
                  <WrappedStory />
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </MockIndexPatternsKibanaContextProvider>
        </I18nProvider>
      );
    },
    decorateWithGlobalStorybookThemeProviders,
  ],
  argTypes: {
    logIndices: {
      control: {
        type: 'object',
      },
    },
    availableIndexPatterns: {
      control: {
        type: 'object',
      },
    },
  },
} as Meta;

type IndicesConfigurationPanelProps = PropsOf<typeof IndicesConfigurationPanel>;

type IndicesConfigurationPanelStoryArgs = Pick<
  IndicesConfigurationPanelProps,
  'isLoading' | 'isReadOnly'
> & {
  availableIndexPatterns: MockIndexPatternSpec[];
  logIndices: LogIndicesFormState;
};

const IndicesConfigurationPanelTemplate: Story<IndicesConfigurationPanelStoryArgs> = ({
  isLoading,
  isReadOnly,
  logIndices,
}) => {
  const logIndicesFormElement = useLogIndicesFormElement(logIndices);

  return (
    <>
      <IndicesConfigurationPanel
        isLoading={isLoading}
        isReadOnly={isReadOnly}
        indicesFormElement={logIndicesFormElement}
      />
      <EuiCodeBlock language="json">
        // field states{'\n'}
        {JSON.stringify(
          {
            logIndices: {
              value: logIndicesFormElement.value,
              validity: logIndicesFormElement.validity,
            },
          },
          null,
          2
        )}
      </EuiCodeBlock>
    </>
  );
};

const defaultArgs: IndicesConfigurationPanelStoryArgs = {
  isLoading: false,
  isReadOnly: false,
  logIndices: {
    type: 'index_name' as const,
    indexName: 'logs-*',
  },
  availableIndexPatterns: [
    {
      id: 'INDEX_PATTERN_A',
      title: 'pattern-a-*',
      timeFieldName: '@timestamp',
      type: undefined,
      fields: [
        {
          name: '@timestamp',
          type: KBN_FIELD_TYPES.DATE,
          searchable: true,
          aggregatable: true,
        },
        {
          name: 'message',
          type: KBN_FIELD_TYPES.STRING,
          searchable: true,
          aggregatable: true,
        },
      ],
    },
    {
      id: 'INDEX_PATTERN_B',
      title: 'pattern-b-*',
      timeFieldName: '@timestamp',
      type: undefined,
      fields: [],
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
  logIndices: undefined,
};
