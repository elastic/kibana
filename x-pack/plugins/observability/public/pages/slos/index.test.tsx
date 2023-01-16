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
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { SlosPage } from '.';
import { emptySloList, sloList } from '../../data/slo';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
jest.mock('../../hooks/slo/use_fetch_slo_list');
jest.mock('../../hooks/use_breadcrumbs');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useFetchSloListMock = useFetchSloList as jest.Mock;

const config: Subset<ConfigSchema> = {
  unsafe: {
    slo: { enabled: true },
  },
};

describe('SLOs Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the not found page when the feature flag is not enabled', async () => {
    useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });

    render(<SlosPage />, { unsafe: { slo: { enabled: false } } });

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  describe('when the feature flag is enabled', () => {
    it('renders nothing when the API is loading', async () => {
      useFetchSloListMock.mockReturnValue({ loading: true, sloList: emptySloList });

      const { container } = render(<SlosPage />, config);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders the SLOs Welcome Prompt when the API has finished loading and there are no results', async () => {
      useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });
      render(<SlosPage />, config);

      expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();
    });

    it('renders the SLOs page when the API has finished loading and there are results', async () => {
      useFetchSloListMock.mockReturnValue({ loading: false, sloList });
      render(<SlosPage />, config);

      expect(screen.queryByTestId('slosPage')).toBeTruthy();
      expect(screen.queryByTestId('sloList')).toBeTruthy();
    });
  });
});
