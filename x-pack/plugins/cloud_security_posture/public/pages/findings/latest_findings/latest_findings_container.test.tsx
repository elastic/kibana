/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryResult } from 'react-query';
import { createReactQueryResponse } from '../../../test/fixtures/react_query';
import React from 'react';
import { render } from '@testing-library/react';
import { LatestFindingsContainer, getDefaultQuery } from './latest_findings_container';
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../common/constants';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { TestProvider } from '../../../test/test_provider';
import { getFindingsQuery } from './use_latest_findings';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { useLocation } from 'react-router-dom';
import { RisonObject } from 'rison-node';
import { buildEsQuery } from '@kbn/es-query';
import { getPaginationQuery } from '../utils';
import { FindingsEsPitContext } from '../es_pit/findings_es_pit_context';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';

jest.mock('../../../common/api/use_latest_findings_data_view');
jest.mock('../../../common/api/use_cis_kubernetes_integration');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useLocation: jest.fn(),
}));

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('<LatestFindingsContainer />', () => {
  it('data#search.search fn called with URL query', () => {
    const query = getDefaultQuery({
      filters: [],
      query: { language: 'kuery', query: '' },
    });
    const dataMock = dataPluginMock.createStartContract();
    const dataView = createStubDataView({
      spec: {
        id: CSP_LATEST_FINDINGS_DATA_VIEW,
      },
    });

    (useLocation as jest.Mock).mockReturnValue({
      search: encodeQuery(query as unknown as RisonObject),
    });

    const setPitId = jest.fn();
    const pitIdRef = { current: '' };
    const pitQuery = createReactQueryResponse({
      status: 'success',
      data: '',
    }) as UseQueryResult<string>;

    render(
      <TestProvider
        deps={{
          data: dataMock,
          unifiedSearch: unifiedSearchPluginMock.createStartContract(),
          charts: chartPluginMock.createStartContract(),
        }}
      >
        <FindingsEsPitContext.Provider value={{ setPitId, pitIdRef, pitQuery }}>
          <LatestFindingsContainer dataView={dataView} />
        </FindingsEsPitContext.Provider>
      </TestProvider>
    );

    const baseQuery = {
      query: buildEsQuery(dataView, query.query, query.filters),
      pitId: pitIdRef.current,
    };

    expect(dataMock.search.search).toHaveBeenNthCalledWith(1, {
      params: getFindingsQuery({
        ...baseQuery,
        ...getPaginationQuery(query),
        sort: query.sort,
        enabled: true,
      }),
    });
  });
});
