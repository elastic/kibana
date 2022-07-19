/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';

import type { DryRunResult } from './use_bulk_actions_dry_run';
import { BulkEditRuleErrorsList } from './bulk_edit_rule_errors_list';
import { BulkActionsDryRunErrCode } from '../../../../../../../common/constants';

const Wrapper: FC = ({ children }) => {
  return (
    <IntlProvider locale="en">
      <>{children}</>
    </IntlProvider>
  );
};

describe('Component BulkEditRuleErrorsList', () => {
  test('should not render component if no errors present', () => {
    const { container } = render(<BulkEditRuleErrorsList ruleErrors={[]} />, { wrapper: Wrapper });

    expect(container.childElementCount).toEqual(0);
  });

  test('should render multiple error messages', () => {
    const ruleErrors: DryRunResult['ruleErrors'] = [
      {
        message: 'test failure',
        ruleIds: ['rule:1', 'rule:2'],
      },
      {
        message: 'another failure',
        ruleIds: ['rule:1'],
      },
    ];
    render(<BulkEditRuleErrorsList ruleErrors={ruleErrors} />, { wrapper: Wrapper });

    expect(screen.getByText("2 rules can't be edited (test failure)")).toBeInTheDocument();
    expect(screen.getByText("1 rule can't be edited (another failure)")).toBeInTheDocument();
  });

  test.each([
    [
      BulkActionsDryRunErrCode.IMMUTABLE,
      '2 prebuilt Elastic rules (editing prebuilt rules is not supported)',
    ],
    [
      BulkActionsDryRunErrCode.MACHINE_LEARNING_INDEX_PATTERN,
      "2 custom Machine Learning rules (these rules don't have index patterns)",
    ],
    [
      BulkActionsDryRunErrCode.MACHINE_LEARNING_AUTH,
      "2 Machine Learning rules can't be edited (test failure)",
    ],
    [undefined, "2 rules can't be edited (test failure)"],
  ])('should render correct message for "%s" errorCode', (errorCode, value) => {
    const ruleErrors: DryRunResult['ruleErrors'] = [
      {
        message: 'test failure',
        errorCode,
        ruleIds: ['rule:1', 'rule:2'],
      },
    ];
    render(<BulkEditRuleErrorsList ruleErrors={ruleErrors} />, { wrapper: Wrapper });

    expect(screen.getByText(value)).toBeInTheDocument();
  });
});
