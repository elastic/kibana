/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { getComparisonEnabled } from './get_comparison_enabled';

describe('getComparisonEnabled', () => {
  function mockValues({
    uiSettings,
    urlComparisonEnabled,
  }: {
    uiSettings: boolean;
    urlComparisonEnabled?: boolean;
  }) {
    return {
      core: { uiSettings: { get: () => uiSettings } } as unknown as CoreStart,
      urlComparisonEnabled,
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when kibana config is disabled and url is empty', () => {
    const { core, urlComparisonEnabled } = mockValues({
      uiSettings: false,
      urlComparisonEnabled: undefined,
    });
    expect(getComparisonEnabled({ core, urlComparisonEnabled })).toBeFalsy();
  });

  it('returns true when kibana config is enabled and url is empty', () => {
    const { core, urlComparisonEnabled } = mockValues({
      uiSettings: true,
      urlComparisonEnabled: undefined,
    });
    expect(getComparisonEnabled({ core, urlComparisonEnabled })).toBeTruthy();
  });

  it('returns true when defined as true in the url', () => {
    const { core, urlComparisonEnabled } = mockValues({
      uiSettings: false,
      urlComparisonEnabled: true,
    });
    expect(getComparisonEnabled({ core, urlComparisonEnabled })).toBeTruthy();
  });

  it('returns false when defined as false in the url', () => {
    const { core, urlComparisonEnabled } = mockValues({
      uiSettings: true,
      urlComparisonEnabled: false,
    });
    expect(getComparisonEnabled({ core, urlComparisonEnabled })).toBeFalsy();
  });
});
