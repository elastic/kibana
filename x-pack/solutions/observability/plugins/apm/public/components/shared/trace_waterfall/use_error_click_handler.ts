/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { useCallback } from 'react';
import { ENVIRONMENT_ALL_VALUE } from '../../../../common/environment_filter_values';
import { isMobileAgentName } from '../../../../common/agent_name';
import { SPAN_ID, TRACE_ID, TRANSACTION_ID } from '../../../../common/es_fields/apm';
import { toAnyOfKuery } from '../../../../common/utils/kuery_utils';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import type { OnErrorClick } from './trace_waterfall_context';

/**
 * Callback for error-badge clicks in the trace waterfall.
 *
 * Every click navigates to the Errors page for the clicked item's service, scoped by a
 * kuery on the trace and the clicked document. Both sections of that page — "APM errors"
 * and "Errors from logs" — consume the same kuery, so the span scoping applies uniformly
 * and remains visible (and clearable) in the page's KQL bar.
 *
 * Deliberately source-agnostic: the payload's `errorDocId` / `docIndex` / `errorSource`
 * are not read here. Other waterfall hosts (the full-trace flyout and the Discover
 * unified doc viewer) still open flyouts from the same callback — that is intentional,
 * those surfaces have no Errors page to navigate to.
 */
export function useErrorClickHandler(traceItems: TraceItem[]): OnErrorClick {
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
    ({ traceId: errorTraceId, docId }) => {
      const item = traceItems?.find((i) => i.id === docId);
      if (!item) return;

      // OTel-native error documents carry `span.id` but no `transaction.id`, while classic
      // APM errors populate both. The waterfall item id is itself `span.id ?? transaction.id`,
      // so match either field instead of guessing one from the doc type.
      //
      // Known limitation: for a classic-APM transaction row whose badge shows only span-less
      // errors (keyed by `transaction.id` with no `span.id`), this OR form also pulls in
      // child-span errors that share `transaction.id` — making the Errors page wider than the
      // badge count. The server-side `docIdQuery` in `getApmTraceErrorQuery` already applies
      // the correct `transaction.id + must_not exists span.id` semantics; mirroring that here
      // requires distinguishing classic-APM transaction rows from OTel-native ones (where
      // `item.docType === 'transaction'` but `item.id` IS a span ID and errors are keyed by
      // `span.id`). Safe fix requires a per-item flag — tracked for a follow-up.
      //
      // `transaction.id` is unmapped in the logs indices that back the "Errors from logs"
      // section. kqlQuery() compiles it to a match_phrase, which Elasticsearch resolves to
      // match-nothing on an unmapped field rather than failing, so the clause is inert there.
      const docIdKuery = toAnyOfKuery([
        [SPAN_ID, docId],
        [TRANSACTION_ID, docId],
      ]);
      const kuery = `${TRACE_ID} : "${errorTraceId}" and ${docIdKuery}`;

      // `query` is the transactions/view (or dependencies/operation) query, which declares
      // its own `traceId`. apmRouter.link() does NOT strip params the target route omits —
      // it stringifies the raw merged query — so drop them explicitly rather than letting
      // stale ids ride along into the Errors page URL.
      //
      // Several fields are required on the errors routes but optional on the source routes
      // (because `dependencies/operation` inherits rangeFrom/rangeTo/comparisonEnabled from
      // its parent, so the union type widens them to `string | undefined` / `boolean | undefined`).
      // Provide safe fallbacks for all of them after the spread so TypeScript sees definite types.
      const baseQuery = {
        ...omit(query, ['traceId', 'spanId']),
        environment: query.environment ?? ENVIRONMENT_ALL_VALUE,
        rangeFrom: query.rangeFrom ?? '',
        rangeTo: query.rangeTo ?? '',
        comparisonEnabled: query.comparisonEnabled ?? false,
      };

      const href = isMobileAgentName(item.agentName)
        ? apmRouter.link('/mobile-services/{serviceName}/errors-and-crashes', {
            path: { serviceName: item.serviceName },
            query: { ...baseQuery, serviceGroup: '', kuery },
          })
        : apmRouter.link('/services/{serviceName}/errors', {
            path: { serviceName: item.serviceName },
            query: { ...baseQuery, serviceGroup: '', kuery },
          });

      navigateToUrl(href);
    },
    [traceItems, apmRouter, query, navigateToUrl]
  );
}
