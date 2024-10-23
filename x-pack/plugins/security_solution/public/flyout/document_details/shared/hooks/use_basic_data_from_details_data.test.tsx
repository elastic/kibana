/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useBasicDataFromDetailsData } from './use_basic_data_from_details_data';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_data_formatted_for_field_browser';

describe('useBasicDataFromDetailsData', () => {
  it('should return all empty properties', () => {
    const hookResult = renderHook(() => useBasicDataFromDetailsData(null));

    expect(hookResult.result.current.agentId).toEqual('');
    expect(hookResult.result.current.alertId).toEqual('');
    expect(hookResult.result.current.alertUrl).toEqual('');
    expect(hookResult.result.current.data).toEqual(null);
    expect(hookResult.result.current.hostName).toEqual('');
    expect(hookResult.result.current.indexName).toEqual('');
    expect(hookResult.result.current.isAlert).toEqual(false);
    expect(hookResult.result.current.ruleDescription).toEqual('');
    expect(hookResult.result.current.ruleId).toEqual('');
    expect(hookResult.result.current.ruleName).toEqual('');
    expect(hookResult.result.current.timestamp).toEqual('');
    expect(hookResult.result.current.userName).toEqual('');
  });

  it('should return all properties', () => {
    const hookResult = renderHook(() =>
      useBasicDataFromDetailsData(mockDataFormattedForFieldBrowser)
    );

    expect(hookResult.result.current.agentId).toEqual('agent.id');
    expect(hookResult.result.current.alertId).toEqual('_id');
    expect(hookResult.result.current.alertUrl).toEqual('alert-url');
    expect(hookResult.result.current.data).toEqual(mockDataFormattedForFieldBrowser);
    expect(hookResult.result.current.hostName).toEqual('host-name');
    expect(hookResult.result.current.indexName).toEqual('index');
    expect(hookResult.result.current.isAlert).toEqual(true);
    expect(hookResult.result.current.ruleDescription).toEqual('rule-description');
    expect(hookResult.result.current.ruleId).toEqual('rule-uuid');
    expect(hookResult.result.current.ruleName).toEqual('rule-name');
    expect(hookResult.result.current.timestamp).toEqual('2023-01-01T01:01:01.000Z');
    expect(hookResult.result.current.userName).toEqual('user-name');
  });
});
