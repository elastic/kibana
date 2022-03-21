/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UseQueryResult } from 'react-query';
import { render, screen } from '@testing-library/react';
import { useKubebeatDataView } from '../../common/api/use_kubebeat_data_view';
import { Findings } from './findings';
import { TestProvider } from '../../test/test_provider';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { UnifiedSearchPublicPluginStart } from '../../../../../../src/plugins/unified_search/public';
import { unifiedSearchPluginMock } from '../../../../../../src/plugins/unified_search/public/mocks';
import { createStubDataView } from '../../../../../../src/plugins/data_views/public/data_views/data_view.stub';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import * as TEST_SUBJECTS from './test_subjects';
import type { DataView } from '../../../../../../src/plugins/data/common';

jest.mock('../../common/api/use_kubebeat_data_view');

beforeEach(() => {
  jest.restoreAllMocks();
});

const Wrapper = ({
  data = dataPluginMock.createStartContract(),
  unifiedSearch = unifiedSearchPluginMock.createStartContract(),
}: {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}) => (
  <TestProvider deps={{ data, unifiedSearch }}>
    <Findings />
  </TestProvider>
);

describe('<Findings />', () => {
  it("renders the success state component when 'kubebeat' DataView exists and request status is 'success'", async () => {
    const data = dataPluginMock.createStartContract();
    const unifiedSearch = unifiedSearchPluginMock.createStartContract();
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

    render(<Wrapper data={data} unifiedSearch={unifiedSearch} />);

    expect(await screen.findByTestId(TEST_SUBJECTS.FINDINGS_CONTAINER)).toBeInTheDocument();
  });
});
