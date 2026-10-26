/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiThemeComputed } from '@elastic/eui';
import { getFailureBadgeDescriptor } from './failure_badge';

describe('getFailureBadgeDescriptor', () => {
  const euiTheme = { colors: { danger: '#ff0000' } } as EuiThemeComputed;

  it('describes the badge for a failed outcome', () => {
    expect(getFailureBadgeDescriptor('failure', euiTheme)).toEqual({
      label: 'failure',
      color: '#ff0000',
      toolTipContent: 'event.outcome = failure',
    });
  });

  it('returns undefined for any other outcome', () => {
    expect(getFailureBadgeDescriptor('success', euiTheme)).toBeUndefined();
    expect(getFailureBadgeDescriptor(undefined, euiTheme)).toBeUndefined();
  });
});
