/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiSuperSelect } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';

const DEFAULT_P = 50;

export function UserPercentile() {
  const history = useHistory();

  const {
    urlParams: { percentile },
  } = useUrlParams();

  const updatePercentile = useCallback(
    (percentileN?: number) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          percentile: percentileN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  useEffect(() => {
    if (!percentile) {
      updatePercentile(DEFAULT_P);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = [
    {
      value: '50',
      inputDisplay: 'P50 (Median)',
      'data-test-subj': 'p50-percentile',
    },
    {
      value: '75',
      inputDisplay: 'P75',
      'data-test-subj': 'p75-percentile',
    },
    {
      value: '90',
      inputDisplay: 'P90',
      'data-test-subj': 'p90-percentile',
    },
    {
      value: '95',
      inputDisplay: 'P95',
      'data-test-subj': 'p95-percentile',
    },
    {
      value: '99',
      inputDisplay: 'P99',
      'data-test-subj': 'p99-percentile',
    },
  ];

  const onChange = (val: string) => {
    updatePercentile(Number(val));
  };

  return (
    <EuiSuperSelect
      style={{ width: 150 }}
      options={options}
      valueOfSelected={String(percentile ?? DEFAULT_P)}
      onChange={(value) => onChange(value)}
    />
  );
}
