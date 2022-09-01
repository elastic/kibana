/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlowTarget, FlowTargetSourceDest } from '../../../../../common/search_strategy';
import type { CriteriaFields } from '../types';
import { networkToCriteria } from './network_to_criteria';

describe('network_to_criteria', () => {
  test('converts a network to a criteria of source if given a source', () => {
    const expectedCriteria: CriteriaFields[] = [
      {
        fieldName: 'source.ip',
        fieldValue: '127.0.0.1',
      },
    ];
    expect(networkToCriteria('127.0.0.1', FlowTargetSourceDest.source)).toEqual(expectedCriteria);
  });

  test('converts a network to a criteria of destination if given a destination', () => {
    const expectedCriteria: CriteriaFields[] = [
      {
        fieldName: 'destination.ip',
        fieldValue: '127.0.0.1',
      },
    ];
    expect(networkToCriteria('127.0.0.1', FlowTargetSourceDest.destination)).toEqual(
      expectedCriteria
    );
  });

  test('returns an empty array if the Flow Type is anything else', () => {
    expect(
      networkToCriteria('127.0.0.1', FlowTarget.server as unknown as FlowTargetSourceDest)
    ).toEqual([]);
  });
});
