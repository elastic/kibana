/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TraceList } from './TraceList';
import { EuiSpacer } from '@elastic/eui';
import EmptyMessage from '../../shared/EmptyMessage';

import { TraceListRequest } from '../../../store/reactReduxRequest/traceList';

export function TraceOverview(props) {
  const { urlParams } = props;

  return (
    <div>
      <EuiSpacer />
      <TraceListRequest
        urlParams={urlParams}
        render={({ data }) => (
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
