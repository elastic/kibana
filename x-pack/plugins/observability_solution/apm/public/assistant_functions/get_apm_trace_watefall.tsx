/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public/types';
import { isEmpty } from 'lodash';
import { getWaterfall } from '../../common/waterfall/waterfall_helpers';
import type {
  GetApmTraceWaterfallFunctionArguments,
  GetApmTraceWaterfallFunctionResponse,
} from '../../server/assistant_functions/get_apm_trace_waterfall';
import { ResettingHeightRetainer } from '../components/shared/height_retainer/resetting_height_container';
import { ApmThemeProvider } from '../components/routing/app_root';
import { WaterfallContent } from '../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall_content';

export function registerGetApmTraceWaterfallFunction({
  registerRenderFunction,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) {
  registerRenderFunction('get_apm_trace_waterfall', (parameters) => {
    const { response } = parameters as Parameters<
      RenderFunction<GetApmTraceWaterfallFunctionArguments, GetApmTraceWaterfallFunctionResponse>
    >[0];

    if (!response.data || isEmpty(response.data)) {
      return null;
    }

    const waterfall = getWaterfall(response.data);

    return (
      <ApmThemeProvider>
        <ResettingHeightRetainer reset>
          <WaterfallContent
            waterfall={waterfall}
            scrollElement={parameters.scrollElement}
            serviceName={waterfall.entryWaterfallTransaction?.doc.service.name}
            showCriticalPath={false}
            showRelatedErrors={false}
            stickyHeader={false}
          />
        </ResettingHeightRetainer>
      </ApmThemeProvider>
    );
  });
}
