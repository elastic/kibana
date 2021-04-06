/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiPage, EuiPageBody, EuiPageContent, PropsOf } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import {
  MockIndexPattern,
  MockIndexPatternsKibanaContextProvider,
} from '../../../hooks/use_kibana_index_patterns.mock';
import {
  FieldsFormState,
  LogIndicesFormState,
  useFieldsFormElement,
  useLogIndicesFormElement,
} from './indices_configuration_form_state';
import { IndicesConfigurationPanel } from './indices_configuration_panel';

export default {
  title: 'infra/logsSettings/indicesConfiguration',
  decorators: [
    (wrappedStory, { args }) => (
      <I18nProvider>
        <EuiThemeProvider>
          <MockIndexPatternsKibanaContextProvider
            asyncDelay={2000}
            mockIndexPatterns={args.availableIndexPatterns}
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
  availableIndexPatterns: MockIndexPattern[];
  logIndices: LogIndicesFormState;
  fields: FieldsFormState;
};

const IndicesConfigurationPanelTemplate: Story<IndicesConfigurationPanelStoryArgs> = ({
  isLoading,
  isReadOnly,
  logIndices,
  fields,
}) => {
  const logIndicesFormElement = useLogIndicesFormElement(logIndices);
  const { tiebreakerFieldFormElement, timestampFieldFormElement } = useFieldsFormElement(fields);

  return (
    <>
      <IndicesConfigurationPanel
        isLoading={isLoading}
        isReadOnly={isReadOnly}
        indicesFormElement={logIndicesFormElement}
        tiebreakerFieldFormElement={tiebreakerFieldFormElement}
        timestampFieldFormElement={timestampFieldFormElement}
      />
      <EuiCodeBlock language="json">
        // field states{'\n'}
        {JSON.stringify(
          {
            logIndices: {
              value: logIndicesFormElement.value,
              validity: logIndicesFormElement.validity,
            },
            tiebreakerField: {
              value: tiebreakerFieldFormElement.value,
              validity: tiebreakerFieldFormElement.validity,
            },
            timestampField: {
              value: timestampFieldFormElement.value,
              validity: timestampFieldFormElement.validity,
            },
          },
          null,
          2
        )}
      </EuiCodeBlock>
    </>
  );
};

const defaultArgs = {
  isLoading: false,
  isReadOnly: false,
  logIndices: {
    type: 'index-name' as const,
    indexName: 'logs-*',
  },
  fields: {
    tiebreakerField: '_doc',
    timestampField: '@timestamp',
  },
  availableIndexPatterns: [
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
  logIndices: undefined,
};
