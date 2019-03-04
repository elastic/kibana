/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { TraceAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_trace';
import {
  getWaterfall,
  IWaterfall
} from '../../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadTrace } from '../../services/rest/apm/traces';
import { IUrlParams } from '../urlParams';

export const ID = 'waterfall';

interface Props {
  urlParams: IUrlParams;
  traceId?: string;
  render: RRRRender<IWaterfall>;
}

export function WaterfallRequest({ urlParams, render, traceId }: Props) {
  const { start, end } = urlParams;

  if (!(traceId && start && end)) {
    return null;
  }

  return (
    <Request<TraceAPIResponse>
      id={ID}
      fn={loadTrace}
      args={[{ traceId, start, end }]}
      render={({
        args,
        data = { trace: [], errorsPerTransaction: {} },
        status
      }) => {
        const waterfall = getWaterfall(
          data.trace,
          data.errorsPerTransaction,
          urlParams.transactionId
        );
        return render({ args, data: waterfall, status });
      }}
    />
  );
}
