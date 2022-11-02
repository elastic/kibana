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
  EuiCallOut,
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
import { useInsightQuery } from './use_insight_query';
import { useInsightDataProviders } from './use_insight_data_providers';
import { BasicAlertDataContext } from '../../../event_details/investigation_guide_view';
import { InvestigateInTimelineButton } from '../../../event_details/table/investigate_in_timeline_button';

interface InsightComponentProps {
  label: string;
  description?: string;
  providers?: Array<{ field: string; value: string; type: 'literal' | 'parameter' }>;
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
      try {
        configuration = JSON.parse(configurationString);
        if (Array.isArray(configuration.providers)) {
          const providerConfig = configuration.providers.reduce((prev, next) => {
            const { type, ...fieldKeyValue } = next;
            const [[field, value]] = Object.entries(fieldKeyValue);
            return {
              ...prev,
              [field]: {
                value,
                type,
              },
            };
          }, Object.create(null));
          configuration = { ...configuration, ...providerConfig };
          delete configuration.providers;
        }
        return eat(value)({
          type: 'insight',
          ...configuration,
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
const OpenInsightInTimeline = (scopeId) => {
  const InsightComponent = ({
    label,
    description,
    children,
    position,
    type,
    ...providers
  }: InsightComponentProps) => {
    const { data: alertData, alertId } = useContext(BasicAlertDataContext);
    const { dataProviders } = useInsightDataProviders({
      providers,
      scopeId,
      alertData,
      alertId,
    });
    const { totalCount, isQueryLoading, oldestTimestamp } = useInsightQuery({
      dataProviders,
      scopeId,
      alertData,
    });
    return (
      <EuiCallOut title={label} iconType="timeline">
        {isQueryLoading === false ? <p>{`${totalCount} matching events`}</p> : null}
        <p>{description}</p>
        <InvestigateInTimelineButton
          asEmptyButton={false}
          dataProviders={dataProviders}
          timeRange={oldestTimestamp}
        >
          {label ??
            i18n.translate('xpack.securitySolution.markdown.insights.openInsightButtonLabel', {
              defaultMessage: 'Open Insight in Timeline',
            })}
        </InvestigateInTimelineButton>
      </EuiCallOut>
    );
  };
  return InsightComponent;
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
