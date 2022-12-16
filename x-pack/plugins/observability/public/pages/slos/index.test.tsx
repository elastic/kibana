/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { ConfigSchema } from '../../plugin';
import { Subset } from '../../typings';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { SlosPage } from '.';
import { emptySloList } from '../../../common/data/slo';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
jest.mock('../../hooks/slo/use_fetch_slo_list');
jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_breadcrumbs');

const useFetchSloListMock = useFetchSloList as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

const config: Subset<ConfigSchema> = {
  unsafe: {
    slo: { enabled: true },
  },
};

describe('SLOs Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });
  });

  it('renders the not found page when the feature flag is not enabled', async () => {
    render(<SlosPage />, { unsafe: { slo: { enabled: false } } });

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the SLOs page when the feature flag is enabled', async () => {
    render(<SlosPage />, config);

    expect(screen.queryByTestId('slosPage')).toBeTruthy();
    expect(screen.queryByTestId('sloList')).toBeTruthy();
  });
});
