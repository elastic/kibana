/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { FindingsContainer, getDefaultQuery } from './findings_container';
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { TestProvider } from '../../test/test_provider';
import { getFindingsQuery } from './use_findings';
import { encodeQuery } from '../../common/navigation/query_utils';
import { useLocation } from 'react-router-dom';
import { RisonObject } from 'rison-node';
import { buildEsQuery } from '@kbn/es-query';
import { getFindingsCountAggQuery } from './use_findings_count';

jest.mock('../../common/api/use_kubebeat_data_view');
jest.mock('../../common/api/use_cis_kubernetes_integration');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useLocation: jest.fn(),
}));

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('<FindingsContainer />', () => {
  it('data#search.search fn called with URL query', () => {
    const query = getDefaultQuery();
    const dataMock = dataPluginMock.createStartContract();
    const dataView = createStubDataView({
      spec: {
        id: CSP_KUBEBEAT_INDEX_PATTERN,
      },
    });

    (useLocation as jest.Mock).mockReturnValue({
      search: encodeQuery(query as unknown as RisonObject),
    });

    render(
      <TestProvider
        deps={{
          data: dataMock,
          unifiedSearch: unifiedSearchPluginMock.createStartContract(),
        }}
      >
        <FindingsContainer dataView={dataView} />
      </TestProvider>
    );

    const baseQuery = {
      index: dataView.title,
      query: buildEsQuery(dataView, query.query, query.filters),
    };

    expect(dataMock.search.search).toHaveBeenNthCalledWith(1, {
      params: getFindingsCountAggQuery(baseQuery),
    });

    expect(dataMock.search.search).toHaveBeenNthCalledWith(2, {
      params: getFindingsQuery({
        ...baseQuery,
        sort: query.sort,
        size: query.size,
        from: query.from,
      }),
    });
  });
});
