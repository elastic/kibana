/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UseQueryResult } from 'react-query';
import { render, screen } from '@testing-library/react';
import { Findings } from './findings';
import { MISSING_KUBEBEAT } from './translations';
import { TestProvider } from '../../test/test_provider';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { createStubDataView } from '../../../../../../src/plugins/data_views/public/data_views/data_view.stub';
import { useKubebeatDataView } from './utils';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import * as TEST_SUBJECTS from './test_subjects';
import type { DataView } from '../../../../../../src/plugins/data/common';

jest.mock('./utils');

beforeEach(() => {
  jest.restoreAllMocks();
});

const Wrapper = ({ data = dataPluginMock.createStartContract() }) => (
  <TestProvider deps={{ data }}>
    <Findings />
  </TestProvider>
);

describe('<Findings />', () => {
  it("renders the error state component when 'kubebeat' DataView doesn't exists", async () => {
    (useKubebeatDataView as jest.Mock).mockReturnValue({
      status: 'success',
    } as UseQueryResult<DataView>);

    render(<Wrapper />);

    expect(await screen.findByText(MISSING_KUBEBEAT)).toBeInTheDocument();
  });

  it("renders the error state component when 'kubebeat' request status is 'error'", async () => {
    (useKubebeatDataView as jest.Mock).mockReturnValue({
      status: 'error',
    } as UseQueryResult<DataView>);

    render(<Wrapper />);

    expect(await screen.findByText(MISSING_KUBEBEAT)).toBeInTheDocument();
  });

  it("renders the success state component when 'kubebeat' DataView exists and request status is 'success'", async () => {
    const data = dataPluginMock.createStartContract();
    const source = await data.search.searchSource.create();

    (source.fetch$ as jest.Mock).mockReturnValue({
      toPromise: () => Promise.resolve({ rawResponse: { hits: { hits: [] } } }),
    });

    (useKubebeatDataView as jest.Mock).mockReturnValue({
      status: 'success',
      data: createStubDataView({
        spec: {
          id: CSP_KUBEBEAT_INDEX_PATTERN,
        },
      }),
    } as UseQueryResult<DataView>);

    render(<Wrapper data={data} />);

    expect(await screen.findByTestId(TEST_SUBJECTS.FINDINGS_CONTAINER)).toBeInTheDocument();
  });
});
