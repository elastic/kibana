/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

// NOTE: We're mocking FormattedRelative here because it (currently) has
// console warn issues, and it allows us to skip mocking dates
jest.mock('@kbn/i18n-react', () => ({
  ...(jest.requireActual('@kbn/i18n-react') as object),
  FormattedRelative: jest.fn(() => '20 hours ago'),
}));

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiBadge, EuiHealth, EuiButtonEmpty } from '@elastic/eui';

import { DEFAULT_META } from '../../../../shared/constants';
import { mountWithIntl } from '../../../../test_helpers';

import { ApiLogsTable } from './';

describe('ApiLogsTable', () => {
  const apiLogs = [
    {
      timestamp: '1970-01-01T00:00:00.000Z',
      status: 404,
      http_method: 'GET',
      full_request_path: '/api/as/v1/test',
    },
    {
      timestamp: '1970-01-01T00:00:00.000Z',
      status: 500,
      http_method: 'DELETE',
      full_request_path: '/api/as/v1/test',
    },
    {
      timestamp: '1970-01-01T00:00:00.000Z',
      status: 200,
      http_method: 'POST',
      full_request_path: '/api/as/v1/engines/some-engine/search',
    },
  ];

  const values = {
    dataLoading: false,
    apiLogs,
    meta: DEFAULT_META,
  };
  const actions = {
    onPaginate: jest.fn(),
    openFlyout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = mountWithIntl(<ApiLogsTable />);
    const tableContent = wrapper.find(EuiBasicTable).text();

    expect(tableContent).toContain('Method');
    expect(tableContent).toContain('GET');
    expect(tableContent).toContain('DELETE');
    expect(tableContent).toContain('POST');
    expect(wrapper.find(EuiBadge)).toHaveLength(3);

    expect(tableContent).toContain('Time');
    expect(tableContent).toContain('20 hours ago');

    expect(tableContent).toContain('Endpoint');
    expect(tableContent).toContain('/api/as/v1/test');
    expect(tableContent).toContain('/api/as/v1/engines/some-engine/search');

    expect(tableContent).toContain('Status');
    expect(tableContent).toContain('404');
    expect(tableContent).toContain('500');
    expect(tableContent).toContain('200');
    expect(wrapper.find(EuiHealth)).toHaveLength(3);

    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(3);
    wrapper.find('[data-test-subj="ApiLogsTableDetailsButton"]').first().simulate('click');
    expect(actions.openFlyout).toHaveBeenCalled();
  });

  describe('hasPagination', () => {
    it('does not render with pagination by default', () => {
      const wrapper = shallow(<ApiLogsTable />);

      expect(wrapper.find(EuiBasicTable).prop('pagination')).toBeFalsy();
    });

    it('renders pagination if hasPagination is true', () => {
      const wrapper = shallow(<ApiLogsTable hasPagination />);

      expect(wrapper.find(EuiBasicTable).prop('pagination')).toBeTruthy();
    });
  });
});
