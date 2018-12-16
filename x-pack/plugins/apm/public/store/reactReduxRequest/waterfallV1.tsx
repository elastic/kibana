/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import {
  SERVICE_NAME,
  TRANSACTION_ID
} from 'x-pack/plugins/apm/common/constants';
import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  getWaterfall,
  IWaterfall
} from '../../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { loadSpans } from '../../services/rest/apm/transactions';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

export const ID = 'waterfallV1';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<IWaterfall>;
}

export function WaterfallV1Request({ urlParams, transaction, render }: Props) {
  const { start, end } = urlParams;
  const transactionId: string = get(transaction, TRANSACTION_ID);
  const serviceName: string = get(transaction, SERVICE_NAME);

  if (!(serviceName && transactionId && start && end)) {
    return null;
  }

  return (
    <Request<Span[]>
      id={ID}
      fn={loadSpans}
      args={[{ serviceName, start, end, transactionId }]}
      render={({ status, data = [], args }) => {
        const waterfall = getWaterfall([transaction, ...data], transaction);
        return render({ status, data: waterfall, args });
      }}
    />
  );
}
