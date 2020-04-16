/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./kibana_services', () => ({}));

import { getSourceFields } from './index_pattern_util';

describe('getSourceFields', () => {
  test('Should remove multi fields from field list', () => {
    const fields = [
      {
        name: 'agent',
      },
      {
        name: 'agent.keyword',
        subType: {
          multi: {
            parent: 'agent',
          },
        },
      },
    ];
    const sourceFields = getSourceFields(fields);
    expect(sourceFields).toEqual([{ name: 'agent' }]);
  });
});
