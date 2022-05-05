/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderRuleStats } from './rule_stats';
import { render } from '@testing-library/react';

describe('Rule stats', () => {
  test('renders all rule stats', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    expect(stats.length).toEqual(6);
  });
  test('disabled stat is not clickable, when there are no disabled rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { findByText, container } = render(stats[4]);
    const disabledElement = await findByText('Disabled');
    expect(disabledElement).toBeInTheDocument();
    expect(container.getElementsByClassName('euiStat').length).toBe(1);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(0);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(0);
  });

  test('disabled stat is clickable, when there are disabled rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 1,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[4]);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(1);
  });

  test('disabled stat count is link-colored, when there are disabled rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 1,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[4]);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(1);
  });

  test('snoozed stat is not clickable, when there are no snoozed rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { findByText, container } = render(stats[3]);
    const snoozedElement = await findByText('Snoozed');
    expect(snoozedElement).toBeInTheDocument();
    expect(container.getElementsByClassName('euiStat').length).toBe(1);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(0);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(0);
  });

  test('snoozed stat is clickable, when there are snoozed rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 1,
        error: 0,
        snoozed: 1,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[3]);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(1);
  });

  test('snoozed stat count is link-colored, when there are snoozed rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 1,
        error: 0,
        snoozed: 1,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[3]);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(1);
  });

  test('errors stat is not clickable, when there are no error rules', async () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 0,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { findByText, container } = render(stats[2]);
    const errorsElement = await findByText('Errors');
    expect(errorsElement).toBeInTheDocument();
    expect(container.getElementsByClassName('euiStat').length).toBe(1);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(0);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(0);
  });

  test('errors stat is clickable, when there are error rules', () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 2,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[2]);
    expect(container.getElementsByClassName('euiButtonEmpty').length).toBe(1);
  });

  test('errors stat count is link-colored, when there are error rules', () => {
    const stats = renderRuleStats(
      {
        total: 11,
        disabled: 0,
        muted: 0,
        error: 2,
        snoozed: 0,
      },
      '/app/observability/alerts/rules',
      false
    );
    const { container } = render(stats[2]);
    expect(container.getElementsByClassName('euiStat__title--primary').length).toBe(1);
  });
});
