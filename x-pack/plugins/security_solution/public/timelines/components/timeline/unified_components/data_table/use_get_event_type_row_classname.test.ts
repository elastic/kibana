/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useGetEventTypeRowClassName } from './use_get_event_type_row_classname';
import { renderHook } from '@testing-library/react-hooks';

const mockOddEqlEvent = {
  _id: 'test-eql-alert',
  eql: { parentId: 'some-test-id', sequenceNumber: '1-0' },
};

const mockBuildingBlockAlert = {
  _id: 'test-eql-alert',
  eql: { parentId: 'some-test-id', sequenceNumber: '2-0' },
  kibana: {
    alert: { building_block_type: ['default'] },
  },
};

const mockAlert = {
  _id: 'test-alert',
  kibana: { alert: { rule: { uuid: ['test-uuid'], parameters: {} } } },
};

const mockEvent = {
  _id: 'basic-event',
};

describe('useGetEventTypeRowClassName', () => {
  it('should return rawEvent', () => {
    const { result } = renderHook(() => useGetEventTypeRowClassName(mockEvent));
    expect(result.current).toEqual('rawEvent');
  });

  it('should contain eqlSequence', () => {
    const { result } = renderHook(() => useGetEventTypeRowClassName(mockBuildingBlockAlert));
    expect(result.current).toContain('eqlSequence');
  });

  it('should contain buildingBlockType', () => {
    const { result } = renderHook(() => useGetEventTypeRowClassName(mockBuildingBlockAlert));
    expect(result.current).toContain('buildingBlockType');
  });

  it('should return eqlNonSequence', () => {
    const { result } = renderHook(() => useGetEventTypeRowClassName(mockOddEqlEvent));
    expect(result.current).toEqual('eqlNonSequence');
  });

  it('should return nonRawEvent', () => {
    const { result } = renderHook(() => useGetEventTypeRowClassName(mockAlert));
    expect(result.current).toEqual('nonRawEvent');
  });
});
