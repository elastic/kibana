/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiSelect } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { I18LABELS } from '../translations';

const DEFAULT_P = 50;

export function UserPercentile() {
  const history = useHistory();

  const {
    urlParams: { percentile },
  } = useUrlParams();

  const updatePercentile = useCallback(
    (percentileN?: number, replaceHistory?: boolean) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          percentile: percentileN,
        }),
      };
      if (replaceHistory) {
        history.replace(newLocation);
      } else {
        history.push(newLocation);
      }
    },
    [history]
  );

  useEffect(() => {
    if (!percentile) {
      updatePercentile(DEFAULT_P, true);
    }
  });

  const options = [
    {
      value: '50',
      text: I18LABELS.percentile50thMedian,
      'data-test-subj': 'p50Percentile',
    },
    {
      value: '75',
      text: I18LABELS.percentile75th,
      'data-test-subj': 'p75Percentile',
    },
    {
      value: '90',
      text: I18LABELS.percentile90th,
      'data-test-subj': 'p90Percentile',
    },
    {
      value: '95',
      text: I18LABELS.percentile95th,
      'data-test-subj': 'p95Percentile',
    },
    {
      value: '99',
      text: I18LABELS.percentile99th,
      'data-test-subj': 'p99Percentile',
    },
  ];

  const onChange = (val: string) => {
    updatePercentile(Number(val));
  };

  return (
    <EuiSelect
      prepend={I18LABELS.percentile}
      data-test-subj="uxPercentileSelect"
      style={{ width: 150 }}
      options={options}
      onChange={(evt) => onChange(evt.target.value)}
    />
  );
}
