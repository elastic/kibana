/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { isMobileAgentName } from '../../../../common/agent_name';
import { SPAN_ID, TRACE_ID, TRANSACTION_ID } from '../../../../common/es_fields/apm';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import type { OnErrorClick } from './trace_waterfall_context';

/**
 * Hook that provides a callback for handling error clicks in the trace waterfall.
 * Navigates to the appropriate error page based on the agent type (mobile vs standard).
 */
export function useErrorClickHandler(traceItems: TraceItem[]): OnErrorClick {
  const apmRouter = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer',
    '/dependencies/operation'
  );
  const {
    core: {
      application: { navigateToUrl },
    },
  } = useApmPluginContext();

  return useCallback(
    ({ traceId: errorTraceId, docId }) => {
      const item = traceItems.find((i) => i.id === docId);
      if (!item) return;

      const idField = item.docType === 'span' ? SPAN_ID : TRANSACTION_ID;
      const kuery = `${TRACE_ID} : "${errorTraceId}" and ${idField} : "${docId}"`;

      const href = isMobileAgentName(item.agentName)
        ? apmRouter.link('/mobile-services/{serviceName}/errors-and-crashes', {
            path: { serviceName: item.serviceName },
            query: { ...query, serviceGroup: '', kuery },
          })
        : apmRouter.link('/services/{serviceName}/errors', {
            path: { serviceName: item.serviceName },
            query: { ...query, serviceGroup: '', kuery },
          });

      navigateToUrl(href);
    },
    [traceItems, apmRouter, query, navigateToUrl]
  );
}
