/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
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
      <TraceListRequest
        urlParams={urlParams}
        render={({ data }: { data: ITransactionGroup[] }) => (
          <TraceList
            items={data}
            noItemsMessage={
              <EmptyMessage heading="No traces found for this query" />
            }
          />
        )}
      />
    </div>
  );
}
