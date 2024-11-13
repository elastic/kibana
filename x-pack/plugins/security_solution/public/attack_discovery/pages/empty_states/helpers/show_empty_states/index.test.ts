/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showEmptyStates } from '.';
import {
  showEmptyPrompt,
  showFailurePrompt,
  showNoAlertsPrompt,
  showWelcomePrompt,
} from '../../../helpers';

jest.mock('../../../helpers', () => ({
  showEmptyPrompt: jest.fn().mockReturnValue(false),
  showFailurePrompt: jest.fn().mockReturnValue(false),
  showNoAlertsPrompt: jest.fn().mockReturnValue(false),
  showWelcomePrompt: jest.fn().mockReturnValue(false),
}));

const defaultArgs = {
  aiConnectorsCount: 0,
  alertsContextCount: 0,
  attackDiscoveriesCount: 0,
  connectorId: undefined,
  failureReason: null,
  isLoading: false,
};

describe('showEmptyStates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true if showWelcomePrompt returns true', () => {
    (showWelcomePrompt as jest.Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(true);
  });

  it('returns true if showFailurePrompt returns true', () => {
    (showFailurePrompt as jest.Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
      connectorId: 'test',
      failureReason: 'error',
    });
    expect(result).toBe(true);
  });

  it('returns true if showNoAlertsPrompt returns true', () => {
    (showNoAlertsPrompt as jest.Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
      connectorId: 'test',
    });
    expect(result).toBe(true);
  });

  it('returns true if showEmptyPrompt returns true', () => {
    (showEmptyPrompt as jest.Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(true);
  });

  it('returns false if all prompts return false', () => {
    (showWelcomePrompt as jest.Mock).mockReturnValue(false);
    (showFailurePrompt as jest.Mock).mockReturnValue(false);
    (showNoAlertsPrompt as jest.Mock).mockReturnValue(false);
    (showEmptyPrompt as jest.Mock).mockReturnValue(false);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(false);
  });
});
