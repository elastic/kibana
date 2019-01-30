/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { TraceAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_trace';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  getWaterfall,
  IWaterfall
} from '../../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadTrace } from '../../services/rest/apm/traces';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

export const ID = 'waterfall';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<IWaterfall>;
}

export function WaterfallRequest({ urlParams, transaction, render }: Props) {
  const { start, end } = urlParams;
  const traceId = idx(transaction, _ => _.trace.id);

  if (!(traceId && start && end)) {
    return null;
  }

  return (
    <Request<TraceAPIResponse>
      id={ID}
      fn={loadTrace}
      args={[{ traceId, start, end }]}
      render={({ args, data = [], status }) => {
        const waterfall = getWaterfall(data, transaction);
        return render({ args, data: waterfall, status });
      }}
    />
  );
}
