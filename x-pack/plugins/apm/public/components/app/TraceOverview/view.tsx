/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import { TraceListAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_top_traces';
// @ts-ignore
import { TraceListRequest } from '../../../store/reactReduxRequest/traceList';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { TraceList } from './TraceList';

interface Props {
  urlParams: object;
}

export function TraceOverview(props: Props) {
  const { urlParams } = props;

  return (
    <TraceListRequest
      urlParams={urlParams}
      render={({ data, status }: RRRRenderResponse<TraceListAPIResponse>) => (
        <TraceList
          items={data}
          isLoading={status === 'LOADING'}
          noItemsMessage={
            <EmptyMessage
              heading={i18n.translate('xpack.apm.tracesTable.notFoundLabel', {
                defaultMessage: 'No traces found for this query'
              })}
            />
          }
        />
      )}
    />
  );
}
