/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TraceItem } from '@kbn/apm-types';
import type { OnErrorClick } from '@kbn/apm-ui-shared';
import type { UnifiedDocViewerObservabilityTracesDocumentType } from '@kbn/unified-doc-viewer-plugin/public';
import { isMobileAgentName } from '../../../../../../common/agent_name';
import { SPAN_ID, TRACE_ID, TRANSACTION_ID } from '../../../../../../common/es_fields/apm';
import { toAnyOfKuery } from '../../../../../../common/utils/kuery_utils';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';

export interface OpenDocFlyoutParams {
  type: UnifiedDocViewerObservabilityTracesDocumentType;
  docId: string;
  docIndex: string | undefined;
  activeSection: 'errors-table' | undefined;
}

/**
 * Hook that provides a callback for handling error clicks in the trace waterfall.
 *
 * Routing:
 *  - multiple errors on a row  → span flyout scrolled to the Errors table (any source)
 *  - single unprocessed OTel error → log flyout for the individual error doc
 *  - single classic APM error  → navigate to the APM Errors page
 */
export function useErrorClickHandler(
  traceItems: TraceItem[],
  onOpenDocFlyout: (params: OpenDocFlyoutParams) => void
): OnErrorClick {
  const apmRouter = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );
  const {
    core: {
      application: { navigateToUrl },
    },
  } = useApmPluginContext();

  return useCallback(
    ({ traceId: errorTraceId, docId, errorCount, errorDocId, docIndex, errorSource }) => {
      // Multiple errors on this row → open the span flyout's Errors tab regardless of source.
      if (errorCount > 1) {
        onOpenDocFlyout({ type: 'span', docId, docIndex: undefined, activeSection: 'errors-table' });
        return;
      }

      // Single unprocessed OTel error → open the log doc flyout.
      if (errorSource === 'unprocessedOtel' && errorDocId) {
        onOpenDocFlyout({ type: 'log', docId: errorDocId, docIndex, activeSection: undefined });
        return;
      }

      // Single classic APM error → navigate to the Errors page (unchanged).
      const item = traceItems?.find((i) => i.id === docId);
      if (!item) return;

      // OTel-native error documents carry `span.id` but no `transaction.id`, while classic APM
      // errors populate both. The waterfall item id is itself `span.id ?? transaction.id`, so
      // match either field instead of guessing one from the doc type.
      const docIdKuery = toAnyOfKuery([
        [SPAN_ID, docId],
        [TRANSACTION_ID, docId],
      ]);
      const kuery = `${TRACE_ID} : "${errorTraceId}" and ${docIdKuery}`;

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
    [traceItems, apmRouter, query, navigateToUrl, onOpenDocFlyout]
  );
}
