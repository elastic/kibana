/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react'; // eslint-disable-line import/no-extraneous-dependencies
import { NewSelectionIdBadges } from './new_selection_id_badges';

const props = {
  limit: 2,
  maps: {
    groupsMap: {
      group1: ['job1', 'job2'],
      group2: ['job3'],
    },
  },
  onLinkClick: jest.fn(),
  onDeleteClick: jest.fn(),
  newSelection: ['group1', 'job1', 'job3'],
  showAllBadges: false,
};

describe('NewSelectionIdBadges', () => {
  describe('showAllBarBadges is false', () => {
    test('shows link to show more badges if selection is over limit', () => {
      const { getByText } = render(<NewSelectionIdBadges {...props} />);
      const showMoreLink = getByText('And 1 more');
      expect(showMoreLink).toBeDefined();
    });

    test('does not show link to show more badges if selection is within limit', () => {
      const underLimitProps = { ...props, newSelection: ['group1', 'job1'] };
      const { queryByText } = render(<NewSelectionIdBadges {...underLimitProps} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();
    });
  });

  describe('showAllBarBadges is true', () => {
    const showAllTrueProps = {
      ...props,
      showAllBadges: true,
    };

    test('shows all badges when selection is over limit', () => {
      const { getByText } = render(<NewSelectionIdBadges {...showAllTrueProps} />);
      const group1 = getByText(/group1/);
      const job1 = getByText(/job1/);
      const job3 = getByText(/job3/);
      expect(group1).toBeDefined();
      expect(job1).toBeDefined();
      expect(job3).toBeDefined();
    });

    test('shows hide link when selection is over limit', () => {
      const { getByText, queryByText } = render(<NewSelectionIdBadges {...showAllTrueProps} />);
      const showMoreLink = queryByText(/ more/);
      expect(showMoreLink).toBeNull();

      const hideLink = getByText('Hide');
      expect(hideLink).toBeDefined();
    });
  });
});
