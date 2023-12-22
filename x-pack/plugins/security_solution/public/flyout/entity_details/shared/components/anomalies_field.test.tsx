/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockAnomalies } from '../../../../common/components/ml/mock';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { AnomaliesField } from './anomalies_field';

jest.mock('../../../../common/components/cell_actions', () => {
  const actual = jest.requireActual('../../../../common/components/cell_actions');
  return {
    ...actual,
    SecurityCellActions: () => <></>,
  };
});

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../../../common/containers/use_global_time', () => {
  const actual = jest.requireActual('../../../../common/containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest.fn().mockReturnValue({ from, to }),
  };
});

describe('getAnomaliesFields', () => {
  it('returns max anomaly score', () => {
    const { getByTestId } = render(
      <AnomaliesField
        anomalies={{ isLoading: false, anomalies: mockAnomalies, jobNameById: {} }}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('anomaly-scores')).toBeInTheDocument();
  });
});
