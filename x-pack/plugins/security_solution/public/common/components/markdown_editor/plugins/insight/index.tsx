/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import type { Plugin } from 'unified';
import React, { useContext, useMemo, useState, useCallback } from 'react';
import type { RemarkTokenizer } from '@elastic/eui';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';
import styled from 'styled-components';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  QueryOperator,
  DataProviderType,
  QueryMatch,
  DataProvider,
  DataProvidersAnd,
} from '@kbn/timelines-plugin/common';
import { useKibana } from '../../../../lib/kibana';
const x: InsightComponentProps = {
  description: 'Please look for similar process by the same user.',
  label: 'Similar Processes by User',
  dataProviders: [{ field: 'process.name', value: 'process.Ext.user' }],
};

interface InsightComponentProps {
  label?: string;
  description?: string;
  dataProviders: Array<{ field: string; value: string }>;
}

export const parser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const tokenizeInsight: RemarkTokenizer = function (eat, value, silent) {
    if (value.startsWith('!{insight') === false) {
      return false;
    }

    const nextChar = value[9];
    if (nextChar !== '{' && nextChar !== '}') return false;
    if (silent) {
      return true;
    }

    // is there a configuration?
    const hasConfiguration = nextChar === '{';

    let match = '';
    let configuration: InsightComponentProps = {};
    if (hasConfiguration) {
      let configurationString = '';

      let openObjects = 0;

      for (let i = 9; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          configurationString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          configurationString += char;
        } else {
          configurationString += char;
        }
      }

      match += configurationString;
      console.log(configurationString);
      try {
        configuration = JSON.parse(configurationString);
        const dataProviders = {};
        // configuration.dataProviders;

        return eat(value)({
          type: 'insight',
          ...configuration,
          ...configuration.dataProviders.map((provider) => {
            return {
              [provider.field]: provider.value,
            };
          }),
        });
      } catch (e) {
        console.log(e);
      }
    }
    return false;
  };

  tokenizers.insight = tokenizeInsight;
  methods.splice(methods.indexOf('text'), 0, 'insight');
};

// receives the configuration from the parser and renders
const OpenInsightInTimeline = ({
  label,
  description,
  dataProviders,
  ...fields
}: InsightComponentProps) => {
  const handleOpen = useCallback(() => console.log('click run'), []);
  console.log({ label, description, dataProviders, fields });
  return (
    <>
      <EuiButton iconType={'timeline'} onClick={handleOpen}>
        {label ??
          i18n.translate('xpack.securitySolution.markdown.insights.openInsightButtonLabel', {
            defaultMessage: 'Open Insight in Timeline',
          })}
      </EuiButton>
    </>
  );
};

export { OpenInsightInTimeline as renderer };

const InsightEditorComponent = ({
  node,
  onSave,
  onCancel,
}: EuiMarkdownEditorUiPluginEditorProps<InsightComponentProps>) => {
  return (
    <form>
      <input type="text" />
    </form>
  );
};

export const plugin = {
  name: 'insight',
  button: {
    label: 'Insights',
    iconType: 'timeline',
  },
  helpText: (
    <div>
      <EuiCodeBlock language="md" fontSize="l" paddingSize="s" isCopyable>
        {'!{insight{options}}'}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
    </div>
  ),
  editor: InsightEditorComponent,
};
