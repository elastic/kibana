/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import type { FullTraceWaterfallProps } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { TraceWaterfall } from '.';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { Loading } from './loading';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';

interface Props extends FullTraceWaterfallProps {
  core: CoreStart;
}

export function FullTraceWaterfallRenderer({
  traceId,
  rangeFrom,
  rangeTo,
  serviceName,
  scrollElement,
  onNodeClick,
  onErrorClick,
  core,
}: Props) {
  useEffectOnce(() => {
    createCallApmApi(core);
  });
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
        params: {
          path: { traceId },
          query: {
            start: rangeFrom,
            end: rangeTo,
          },
        },
      });
    },
    [rangeFrom, rangeTo, traceId]
  );

  if (isPending(status)) {
    return <Loading />;
  }

  if (data === undefined) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="TraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('xpack.apm.traceWaterfallEmbeddable.noDataCalloutLabel', {
          defaultMessage: 'Trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return (
    <TraceWaterfall
      traceItems={data.traceItems}
      errors={data.errors}
      onClick={onNodeClick}
      scrollElement={scrollElement}
      isEmbeddable
      showLegend
      serviceName={serviceName}
      onErrorClick={onErrorClick}
      agentMarks={data.agentMarks}
      showCriticalPathControl
    />
  );
}
