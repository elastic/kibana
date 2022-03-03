/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';
import { RuleStatusFailedCallOut } from './rule_status_failed_callout';

jest.mock('../../../../common/lib/kibana');

const TEST_ID = 'ruleStatusFailedCallOut';
const DATE = '2022-01-27T15:03:31.176Z';
const MESSAGE = 'This rule is attempting to query data but...';

describe('RuleStatusFailedCallOut', () => {
  const renderWith = (status: RuleExecutionStatus | null | undefined) =>
    render(<RuleStatusFailedCallOut status={status} date={DATE} message={MESSAGE} />);

  it('is hidden if status is undefined', () => {
    const result = renderWith(undefined);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is null', () => {
    const result = renderWith(null);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "going to run"', () => {
    const result = renderWith(RuleExecutionStatus['going to run']);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "running"', () => {
    const result = renderWith(RuleExecutionStatus.running);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "succeeded"', () => {
    const result = renderWith(RuleExecutionStatus.succeeded);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is visible if status is "partial failure"', () => {
    const result = renderWith(RuleExecutionStatus['partial failure']);
    result.getByTestId(TEST_ID);
    result.getByText('Warning at');
    result.getByText('Jan 27, 2022 @ 15:03:31.176');
    result.getByText(MESSAGE);
  });

  it('is visible if status is "failed"', () => {
    const result = renderWith(RuleExecutionStatus.failed);
    result.getByTestId(TEST_ID);
    result.getByText('Rule failure at');
    result.getByText('Jan 27, 2022 @ 15:03:31.176');
    result.getByText(MESSAGE);
  });
});
