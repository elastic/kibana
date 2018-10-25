/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { RRRRenderArgs } from 'react-redux-request';
import { ITransactionGroup } from '../../../../typings/TransactionGroup';
// @ts-ignore
import { TraceListRequest } from '../../../store/reactReduxRequest/traceList';
import EmptyMessage from '../../shared/EmptyMessage';
import { TraceList } from './TraceList';

interface Props {
  urlParams: object;
}

export function TraceOverview(props: Props) {
  const { urlParams } = props;

  return (
    <div>
      <EuiSpacer />
      <EuiCallOut title="New feature: Distributed Tracing">
        <EuiText>
          The APM UI now supports distributed tracing as a beta feature.{' '}
          <EuiLink
            href="https://www.elastic.co/guide/en/apm/get-started/6.5/distributed-tracing.html"
            target="_blank"
          >
            Learn more about APM distributed tracing.
          </EuiLink>
        </EuiText>
      </EuiCallOut>
      <EuiSpacer />
      <TraceListRequest
        urlParams={urlParams}
        render={({ data, status }: RRRRenderArgs<ITransactionGroup[]>) => (
          <TraceList
            items={data}
            isLoading={status === 'LOADING'}
            noItemsMessage={
              <EmptyMessage heading="No traces found for this query" />
            }
          />
        )}
      />
    </div>
  );
}
