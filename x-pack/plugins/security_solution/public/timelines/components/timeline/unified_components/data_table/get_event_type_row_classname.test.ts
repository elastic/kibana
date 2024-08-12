/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEventTypeRowClassName } from './get_event_type_row_classname';

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

describe('getEventTypeRowClassName', () => {
  it('should return rawEvent', () => {
    const result = getEventTypeRowClassName(mockEvent);
    expect(result).toEqual('rawEvent');
  });

  it('should contain eqlSequence', () => {
    const result = getEventTypeRowClassName(mockBuildingBlockAlert);
    expect(result).toContain('eqlSequence');
  });

  it('should contain buildingBlockType', () => {
    const result = getEventTypeRowClassName(mockBuildingBlockAlert);
    expect(result).toContain('buildingBlockType');
  });

  it('should return eqlNonSequence', () => {
    const result = getEventTypeRowClassName(mockOddEqlEvent);
    expect(result).toEqual('eqlNonSequence');
  });

  it('should return nonRawEvent', () => {
    const result = getEventTypeRowClassName(mockAlert);
    expect(result).toEqual('nonRawEvent');
  });
});
