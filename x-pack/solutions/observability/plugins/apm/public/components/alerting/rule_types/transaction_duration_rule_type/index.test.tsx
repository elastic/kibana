/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { TransactionDurationRuleParams } from '.';
import { TransactionDurationRuleType } from '.';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        uiSettings: { get: jest.fn() },
        notifications: { toasts: { add: jest.fn() } },
        http: { get: jest.fn().mockResolvedValue({}) },
      },
    }),
  };
});

jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: () => ({ data: undefined, status: 'success' }),
  isPending: () => false,
  FETCH_STATUS: { SUCCESS: 'success', LOADING: 'loading', FAILURE: 'failure' },
}));

jest.mock('../../../../services/rest/create_call_apm_api', () => ({
  createCallApmApi: jest.fn(),
}));

const renderRuleType = (
  ruleParams: Partial<TransactionDurationRuleParams>,
  setRuleParams = jest.fn()
) => {
  render(
    <IntlProvider locale="en">
      <TransactionDurationRuleType
        ruleParams={ruleParams as TransactionDurationRuleParams}
        setRuleParams={setRuleParams}
        setRuleProperty={jest.fn()}
      />
    </IntlProvider>
  );
  return { setRuleParams };
};

describe('TransactionDurationRuleType', () => {
  it('defaults groupBy to include transaction.name for new rules', () => {
    const { setRuleParams } = renderRuleType({});

    expect(setRuleParams).toHaveBeenCalledWith('groupBy', [
      SERVICE_NAME,
      SERVICE_ENVIRONMENT,
      TRANSACTION_TYPE,
      TRANSACTION_NAME,
    ]);
  });

  it('preserves existing groupBy when editing a rule', () => {
    const existingGroupBy = [SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE];
    const { setRuleParams } = renderRuleType({
      threshold: 1500,
      groupBy: existingGroupBy,
    });

    expect(setRuleParams).toHaveBeenCalledWith('groupBy', existingGroupBy);
  });

  it('does not inject default groupBy when editing a rule without groupBy', () => {
    const { setRuleParams } = renderRuleType({ threshold: 1500 });

    expect(setRuleParams).not.toHaveBeenCalledWith(
      'groupBy',
      expect.arrayContaining([TRANSACTION_NAME])
    );
  });

  it('preserves empty groupBy array when editing a rule', () => {
    const { setRuleParams } = renderRuleType({ threshold: 1500, groupBy: [] });

    expect(setRuleParams).toHaveBeenCalledWith('groupBy', []);
  });
});
