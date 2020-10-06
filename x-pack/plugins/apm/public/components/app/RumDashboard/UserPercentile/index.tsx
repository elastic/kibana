/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiSuperSelect } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { I18LABELS } from '../translations';

const DEFAULT_P = 50;

const StyledSpan = styled.span`
  font-weight: 600;
`;

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
  });

  const options = [
    {
      value: '50',
      inputDisplay: I18LABELS.percentile50thMedian,
      dropdownDisplay: I18LABELS.percentile50thMedian,
      'data-test-subj': 'p50Percentile',
    },
    {
      value: '75',
      inputDisplay: <StyledSpan>{I18LABELS.percentile75th}</StyledSpan>,
      dropdownDisplay: I18LABELS.percentile75th,
      'data-test-subj': 'p75Percentile',
    },
    {
      value: '90',
      inputDisplay: <StyledSpan>{I18LABELS.percentile90th}</StyledSpan>,
      dropdownDisplay: I18LABELS.percentile90th,
      'data-test-subj': 'p90Percentile',
    },
    {
      value: '95',
      inputDisplay: <StyledSpan>{I18LABELS.percentile95th}</StyledSpan>,
      dropdownDisplay: I18LABELS.percentile95th,
      'data-test-subj': 'p95Percentile',
    },
    {
      value: '99',
      inputDisplay: <StyledSpan>{I18LABELS.percentile99th}</StyledSpan>,
      dropdownDisplay: I18LABELS.percentile99th,
      'data-test-subj': 'p99Percentile',
    },
  ];

  const onChange = (val: string) => {
    updatePercentile(Number(val));
  };

  return (
    <EuiSuperSelect
      prepend={I18LABELS.percentile}
      data-test-subj="uxPercentileSelect"
      style={{ width: 150 }}
      options={options}
      valueOfSelected={String(percentile ?? DEFAULT_P)}
      onChange={(value) => onChange(value)}
    />
  );
}
