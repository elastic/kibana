/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { TRACE_ID } from 'x-pack/plugins/apm/common/constants';
import { TraceAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_trace';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import {
  getWaterfall,
  IWaterfall
} from '../../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadTrace } from '../../services/rest/apm';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

export const ID = 'waterfallV2';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<IWaterfall>;
}

export function WaterfallV2Request({ urlParams, transaction, render }: Props) {
  const { start, end } = urlParams;
  const traceId: string = get(transaction, TRACE_ID);

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
