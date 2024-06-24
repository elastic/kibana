/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RuleTitleProps } from './rule_title';
import { RuleTitle } from './rule_title';
import { TestProvider as ExpandableFlyoutTestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { TestProviders } from '../../../../common/mock';
import type { Rule } from '../../../../detection_engine/rule_management/logic';
import {
  RULE_OVERVIEW_TITLE_TEST_ID,
  RULE_OVERVIEW_RULE_CREATED_BY_TEST_ID,
  RULE_OVERVIEW_RULE_UPDATED_BY_TEST_ID,
  RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID,
} from './test_ids';

const defaultProps = {
  rule: { id: 'id' } as Rule,
  isSuppressed: false,
};

const renderRuleOverviewTitle = (props: RuleTitleProps) =>
  render(
    <TestProviders>
      <ExpandableFlyoutTestProvider>
        <RuleTitle {...props} />
      </ExpandableFlyoutTestProvider>
    </TestProviders>
  );

describe('<RuleOverviewTitle />', () => {
  it('should render title and its components', () => {
    const { getByTestId, queryByTestId } = renderRuleOverviewTitle(defaultProps);

    expect(getByTestId(RULE_OVERVIEW_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_OVERVIEW_RULE_CREATED_BY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_OVERVIEW_RULE_UPDATED_BY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render deleted rule badge', () => {
    const props = {
      ...defaultProps,
      isSuppressed: true,
    };
    const { getByTestId } = renderRuleOverviewTitle(props);
    expect(getByTestId(RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID)).toBeInTheDocument();
  });
});
