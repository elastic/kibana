/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/engine_logic.mock';

import { ReactWrapper } from 'enzyme';

import { nextTick } from '@kbn/test-jest-helpers';

export const runActionColumnTests = (wrapper: ReactWrapper) => {
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('view action', () => {
    it('navigates to the query detail view', () => {
      wrapper.find('[data-test-subj="AnalyticsTableViewQueryButton"]').first().simulate('click');

      expect(navigateToUrl).toHaveBeenCalledWith(
        '/engines/some-engine/analytics/query_detail/some%20search'
      );
    });

    it('falls back to "" for the empty query', () => {
      wrapper.find('[data-test-subj="AnalyticsTableViewQueryButton"]').last().simulate('click');
      expect(navigateToUrl).toHaveBeenCalledWith(
        '/engines/some-engine/analytics/query_detail/%22%22'
      );
    });
  });

  describe('edit action', () => {
    it('calls the find_or_create curation API, then navigates the user to the curation', async () => {
      http.get.mockReturnValue(Promise.resolve({ id: 'cur-123456789' }));
      wrapper.find('[data-test-subj="AnalyticsTableEditQueryButton"]').first().simulate('click');
      await nextTick();

      expect(http.get).toHaveBeenCalledWith(
        '/internal/app_search/engines/some-engine/curations/find_or_create',
        {
          query: { query: 'some search' },
        }
      );
      expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations/cur-123456789');
    });

    it('falls back to "" for the empty query', async () => {
      http.get.mockReturnValue(Promise.resolve({ id: 'cur-987654321' }));
      wrapper.find('[data-test-subj="AnalyticsTableEditQueryButton"]').last().simulate('click');
      await nextTick();

      expect(http.get).toHaveBeenCalledWith(
        '/internal/app_search/engines/some-engine/curations/find_or_create',
        {
          query: { query: '""' },
        }
      );
      expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations/cur-987654321');
    });

    it('handles API errors', async () => {
      http.get.mockReturnValue(Promise.reject());
      wrapper.find('[data-test-subj="AnalyticsTableEditQueryButton"]').first().simulate('click');
      await nextTick();

      expect(flashAPIErrors).toHaveBeenCalled();
    });
  });
};
