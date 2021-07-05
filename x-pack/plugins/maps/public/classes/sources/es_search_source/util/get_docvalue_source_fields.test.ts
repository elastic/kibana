/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocValueAndSourceFields } from './get_docvalue_source_fields';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';

function createMockIndexPattern(fields: IFieldType[]): IndexPattern {
  const indexPattern = {
    get fields() {
      return {
        getByName(fieldname: string) {
          return fields.find((f) => f.name === fieldname);
        },
      };
    },
  };

  return (indexPattern as unknown) as IndexPattern;
}

describe('getDocValueAndSourceFields', () => {
  it('should add runtime fields to docvalue fields', () => {
    const { docValueFields } = getDocValueAndSourceFields(
      createMockIndexPattern([
        {
          name: 'foobar',
          // @ts-expect-error runtimeField not added yet to IFieldType. API tbd
          runtimeField: {},
        },
      ]),
      ['foobar'],
      'epoch_millis'
    );

    expect(docValueFields).toEqual(['foobar']);
  });
});
