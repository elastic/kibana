/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFieldText, EuiLoadingSpinner } from '@elastic/eui';
import { useState } from 'react';
import { isEmpty } from 'lodash';
import { FETCH_STATUS, isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FocusedTraceWaterfall } from '.';

export function FocusedWatefall() {
  const [focusedId, setFocusedId] = useState<string>('86682e13644e14b9');
  const [clicked, setClicked] = useState<number>(0);
  console.log('### caue FocusedWatefall focusedId:', focusedId, clicked);
  const {
    query: { rangeFrom, rangeTo, traceId },
  } = useApmParams('/services/{serviceName}/transactions/view');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!isEmpty(focusedId)) {
        return callApmApi('GET /internal/apm/traces/{traceId}/focused', {
          params: {
            path: {
              traceId: traceId!,
            },
            query: {
              start,
              end,
              focusedTraceItemId: focusedId,
            },
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clicked]
  );

  return (
    <div>
      <div>
        <EuiFieldText
          data-test-subj="apmFocusedWatefallFieldText"
          value={focusedId}
          onChange={(e) => {
            setFocusedId(e.target.value);
          }}
          disabled={FETCH_STATUS.LOADING === status}
        />
        <EuiButton
          disabled={FETCH_STATUS.LOADING === status}
          data-test-subj="apmFocusedWatefallSearchButton"
          onClick={() => setClicked((state) => ++state)}
        >
          {i18n.translate('xpack.apm.focusedWatefall.searchButtonLabel', {
            defaultMessage: 'Search',
          })}
        </EuiButton>
      </div>
      {FETCH_STATUS.LOADING === status ? (
        <EuiLoadingSpinner />
      ) : (
        <>
          {data ? (
            <div>
              <FocusedTraceWaterfall items={data} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
