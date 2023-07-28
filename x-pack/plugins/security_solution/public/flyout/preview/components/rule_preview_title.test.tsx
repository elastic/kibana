/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RulePreviewTitle } from './rule_preview_title';
import { mockFlyoutContextValue } from '../../shared/mocks/mock_flyout_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { TestProviders } from '../../../common/mock';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import {
  RULE_PREVIEW_TITLE_TEST_ID,
  RULE_PREVIEW_RULE_SWITCH_TEST_ID,
  RULE_PREVIEW_RULE_CREATED_BY_TEST_ID,
  RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID,
} from './test_ids';

jest.mock('../../../detection_engine/rule_management/logic/use_start_ml_jobs', () => ({
  useStartMlJobs: jest.fn().mockReturnValue({ startMlJobs: jest.fn() }),
}));

const defaultProps = {
  rule: { id: 'id' } as Rule,
  isButtonDisabled: false,
  isRuleEnabled: true,
};

describe('<RulePreviewTitle />', () => {
  it('should render title and its components', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <RulePreviewTitle {...defaultProps} />
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(RULE_PREVIEW_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_RULE_CREATED_BY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_RULE_SWITCH_TEST_ID)).toBeInTheDocument();
  });

  it('should render updated by and created correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <RulePreviewTitle
            {...defaultProps}
            rule={
              {
                id: 'id',
                created_by: 'test',
                created_at: 'feb 28, 2023',
                updated_by: 'elastic',
                updated_at: 'jan 31, 2023',
              } as Rule
            }
          />
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(RULE_PREVIEW_RULE_CREATED_BY_TEST_ID)).toHaveTextContent(
      'Created by: test on Feb 28, 2023 @ 06:00:00.000'
    );
    expect(getByTestId(RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID)).toHaveTextContent(
      'Updated by: elastic on Jan 31, 2023 @ 06:00:00.000'
    );
  });
});
