/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import {
  mockDataFormattedForFieldBrowser,
  mockDataFormattedForFieldBrowserWithOverridenField,
} from '../mocks/mock_data_formatted_for_field_browser';
import { useHighlightedFields } from './use_highlighted_fields';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../../common/endpoint/service/response_actions/constants';

jest.mock('../../../../common/experimental_features_service');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

describe('useHighlightedFields', () => {
  it('should return data', () => {
    const hookResult = renderHook(() => useHighlightedFields({ dataFormattedForFieldBrowser }));
    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
    });
  });

  it('should return overriden field value when it is present', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowserWithOverridenField,
      })
    );

    // NOTE: overrideField is constructed based on specific field from the result set
    expect(hookResult.result.current).toMatchObject({
      'kibana.alert.threshold_result.terms.field': {
        overrideField: {
          field: 'kibana.alert.threshold_result.terms.value',
          values: ['overriden value'], // missing value in the override
        },
        values: ['original value'],
      },
    });
  });

  it('should omit endpoint agent id field if data is not s1 alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat({
          category: 'agent',
          field: 'agent.id',
          values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
          originalValue: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
          isObjectArray: false,
        }),
        investigationFields: ['agent.status', 'agent.id'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
    });
  });

  it('should return endpoint agent id field if data is s1 alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat([
          {
            category: 'agent',
            field: 'agent.type',
            values: ['endpoint'],
            originalValue: ['endpoint'],
            isObjectArray: false,
          },
          {
            category: 'agent',
            field: 'agent.id',
            values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
            originalValue: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
            isObjectArray: false,
          },
        ]),
        investigationFields: ['agent.status', 'agent.id'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
      'agent.id': {
        values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
      },
    });
  });

  it('should omit sentinelone agent id field if data is not s1 alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat({
          category: 'observer',
          field: `observer.${RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one}`,
          values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
          originalValue: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
          isObjectArray: false,
        }),
        investigationFields: ['agent.status', 'observer.serial_number'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
    });
  });

  it('should omit crowdstrike agent id field if data is not crowdstrike alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat({
          category: 'device',
          field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike,
          values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
          originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
          isObjectArray: false,
        }),
        investigationFields: ['agent.status', 'device.id'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
    });
  });

  it('should return sentinelone agent id field if data is s1 alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat([
          {
            category: 'event',
            field: 'event.module',
            values: ['sentinel_one'],
            originalValue: ['sentinel_one'],
            isObjectArray: false,
          },
          {
            category: 'observer',
            field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one,
            values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
            originalValue: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
            isObjectArray: false,
          },
        ]),
        investigationFields: ['agent.status', 'observer.serial_number'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
      'observer.serial_number': {
        values: ['deb35a20-70f8-458e-a64a-c9e6f7575893'],
      },
    });
  });

  it('should return crowdstrike agent id field if data is crowdstrike alert', () => {
    const hookResult = renderHook(() =>
      useHighlightedFields({
        dataFormattedForFieldBrowser: dataFormattedForFieldBrowser.concat([
          {
            category: 'event',
            field: 'event.module',
            values: ['crowdstrike'],
            originalValue: ['crowdstrike'],
            isObjectArray: false,
          },
          {
            category: 'device',
            field: 'device.id',
            values: ['expectedCrowdstrikeAgentId'],
            originalValue: ['expectedCrowdstrikeAgentId'],
            isObjectArray: false,
          },
        ]),
        investigationFields: ['agent.status', 'device.id'],
      })
    );

    expect(hookResult.result.current).toEqual({
      'kibana.alert.rule.type': {
        values: ['query'],
      },
      'device.id': {
        values: ['expectedCrowdstrikeAgentId'],
      },
    });
  });
});
