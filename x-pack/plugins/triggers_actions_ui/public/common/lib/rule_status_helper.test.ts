/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleHealthColor, getRuleStatusMessage } from './rule_status_helpers';
import { RuleTableItem } from '../../types';

import { getIsExperimentalFeatureEnabled } from '../get_experimental_features';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../../application/sections/rules_list/translations';

jest.mock('../get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockRule = {
  id: '1',
  enabled: true,
  executionStatus: {
    status: 'active',
  },
  lastRun: {
    outcome: 'succeeded',
  },
} as RuleTableItem;

const warningRule = {
  ...mockRule,
  executionStatus: {
    status: 'warning',
  },
  lastRun: {
    outcome: 'warning',
  },
} as RuleTableItem;

const failedRule = {
  ...mockRule,
  executionStatus: {
    status: 'error',
  },
  lastRun: {
    outcome: 'failed',
  },
} as RuleTableItem;

const licenseErrorRule = {
  ...mockRule,
  executionStatus: {
    status: 'error',
    error: {
      reason: 'license',
    },
  },
  lastRun: {
    outcome: 'failed',
    warning: 'license',
  },
} as RuleTableItem;

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

describe('getRuleHealthColor', () => {
  it('should return the correct color for successful rule', () => {
    let color = getRuleHealthColor(mockRule);
    expect(color).toEqual('success');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(mockRule);
    expect(color).toEqual('success');
  });

  it('should return the correct color for warning rule', () => {
    let color = getRuleHealthColor(warningRule);
    expect(color).toEqual('warning');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(warningRule);
    expect(color).toEqual('warning');
  });

  it('should return the correct color for failed rule', () => {
    let color = getRuleHealthColor(failedRule);
    expect(color).toEqual('danger');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(failedRule);
    expect(color).toEqual('danger');
  });
});

describe('getRuleStatusMessage', () => {
  it('should get the status message for a successful rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: mockRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Succeeded');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: mockRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Active');
  });

  it('should get the status message for a warning rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: warningRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Warning');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: warningRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Warning');
  });

  it('should get the status message for a failed rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: failedRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Failed');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: failedRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Error');
  });

  it('should get the status message for a license error rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: licenseErrorRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('License Error');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: licenseErrorRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('License Error');
  });
});
