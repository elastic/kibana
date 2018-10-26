/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RRRRender } from 'react-redux-request';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { WaterfallResponse } from 'x-pack/plugins/apm/typings/waterfall';
import {
  getWaterfall,
  IWaterfall
} from '../../components/app/TransactionDetails/Transaction/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import { IUrlParams } from '../urlParams';
import { WaterfallV1Request } from './waterfallV1';
import { WaterfallV2Request } from './waterfallV2';

interface WaterfallV1OrV2Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<WaterfallResponse>;
}

function WaterfallV1OrV2({
  urlParams,
  transaction,
  render
}: WaterfallV1OrV2Props) {
  const hasTrace = transaction.hasOwnProperty('trace');
  if (hasTrace) {
    return (
      <WaterfallV2Request
        urlParams={urlParams}
        transaction={transaction}
        render={render}
      />
    );
  } else {
    return (
      <WaterfallV1Request
        urlParams={urlParams}
        transaction={transaction}
        render={render}
      />
    );
  }
}

interface WaterfallRequestProps {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<IWaterfall>;
}

export function WaterfallRequest({
  urlParams,
  transaction,
  render
}: WaterfallRequestProps) {
  return (
    <WaterfallV1OrV2
      urlParams={urlParams}
      transaction={transaction}
      render={({ data, status, args }) => {
        const waterfall = getWaterfall(data.hits, data.services, transaction);
        return render({ status, args, data: waterfall });
      }}
    />
  );
}
