/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import { SimpleDocumentCountChart, SimpleAnalysisResultsTable } from '@kbn/aiops-components';

import type { GetAiopsLogRateAnalysisFunctionResponse } from '../../common/types';

import type { AiopsApiPluginStartDeps } from '../types';

export function registerLogRateAnalysisRenderFunction({
  coreStart,
  registerRenderFunction,
  pluginsStart,
}: {
  coreStart: CoreStart;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: AiopsApiPluginStartDeps;
}) {
  const renderFunction: RenderFunction<{}, GetAiopsLogRateAnalysisFunctionResponse> = ({
    arguments: args,
    response,
  }) => {
    if (typeof response.content === 'string') {
      return null;
    }

    return (
      <div css={{ width: '100%' }} data-test-subj={'aiopsDocumentCountChart'}>
        <SimpleDocumentCountChart
          dependencies={{
            charts: pluginsStart.charts,
            fieldFormats: pluginsStart.fieldFormats,
            uiSettings: coreStart.uiSettings,
          }}
          dateHistogram={response.data.dateHistogram}
          changePoint={{
            ...response.data.logRateChange.extendedChangePoint,
            key: 0,
            type: 'spike',
          }}
        />
        <EuiSpacer size="s" />
        <SimpleAnalysisResultsTable tableItems={response.content.significantItems} />
        <EuiSpacer size="s" />
        <p>
          <small>
            Showing the top 5 statistically significant log rate change contributors. A view with
            all results is available in{' '}
            <a href={response.data.logRateAnalysisUILink}>Log Rate Analysis</a>. The AI assistant
            considers all results.
          </small>
        </p>
      </div>
    );
  };
  registerRenderFunction('get_aiops_log_rate_analysis', renderFunction);
}
