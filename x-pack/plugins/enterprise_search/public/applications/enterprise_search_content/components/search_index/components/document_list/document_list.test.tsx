/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiPagination } from '@elastic/eui';

import { Result } from '../../../../../shared/result/result';

import { INDEX_DOCUMENTS_META_DEFAULT } from '../../documents';

import { DocumentList } from './document_list';

const mockActions = {};

export const DEFAULT_VALUES = {
  docs: [],
  docsPerPage: 25,
  isLoading: true,
  mappings: undefined,
  meta: INDEX_DOCUMENTS_META_DEFAULT,
  onPaginate: () => {},
  setDocsPerPage: () => {},
};

const mockValues = { ...DEFAULT_VALUES };

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });
  it('renders empty', () => {
    const wrapper = shallow(<DocumentList {...DEFAULT_VALUES} />);
    expect(wrapper.find(Result)).toHaveLength(0);
    expect(wrapper.find(EuiPagination)).toHaveLength(2);
  });

  it('renders documents when results when there is data and mappings', () => {
    const values = {
      ...DEFAULT_VALUES,
      docs: [
        {
          _id: 'M9ntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 268.24159591388866,
          },
        },
        {
          _id: 'NNntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 68.91388866,
          },
        },
      ],
      mappings: {
        AvgTicketPrice: {
          type: 'float' as const,
        },
      },
    };

    const wrapper = shallow(<DocumentList {...values} />);
    expect(wrapper.find(Result)).toHaveLength(2);
  });

  it('renders callout when total results are 10.000', () => {
    const values = {
      ...DEFAULT_VALUES,
      ...mockValues,
      meta: {
        page: {
          ...INDEX_DOCUMENTS_META_DEFAULT.page,
          total_results: 10000,
        },
      },
    };
    const wrapper = shallow(<DocumentList {...values} />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
