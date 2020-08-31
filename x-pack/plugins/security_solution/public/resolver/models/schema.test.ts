/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as schema from './schema';

interface SortDefinition {
  // page?: number;
  sort: Array<{ field: 'name' | 'ip' | 'date'; direction: 'asc' | 'desc' }>;
}
describe(`a validator made using the 'schema' module which validates that a value has the type:
{
    sort: Array<{
        field: 'name' | 'ip' | 'date';
        direction: 'asc' | 'desc';
    }>;
}`, () => {
  let validator: (value: unknown) => value is SortDefinition;
  beforeEach(() => {
    validator = schema.object({
      sort: schema.array(
        schema.object({
          field: schema.oneOf([
            schema.literal('name' as const),
            schema.literal('ip' as const),
            schema.literal('date' as const),
          ]),
          direction: schema.oneOf([
            schema.literal('asc' as const),
            schema.literal('desc' as const),
          ]),
        })
      ),
    });
  });
  /*
  describe(`when the value to be validated is ${JSON.stringify(validValue())}`, () => {
    beforeEach(() => {
      value = validValue();
    });
    it('should return `true`', () => {
      expect(validator(value)).toBe(true);
    });
  });
  */
  describe.each([
    [
      {
        sort: [
          {
            field: 'name',
            direction: 'asc',
          },
          {
            field: 'date',
            direction: 'desc',
          },
        ],
      },
      true,
    ],
    [
      {
        sort: [
          {
            // missing direction
            field: 'name',
          },
        ],
      },
      false,
    ],
    [
      {
        sort: [
          {
            // invalid direction
            direction: 'invalid',
          },
        ],
      },
      false,
    ],
    [
      {
        sort: [
          {
            // missing field
            direction: 'desc',
          },
        ],
      },
      false,
    ],
    [
      {
        sort: [
          {
            // invalid field
            direction: 'invalid',
          },
        ],
      },
      false,
    ],
    // nothing in the array
    [{ sort: [] }, true],
    // entirely invalid types
    [null, false],
    [true, false],
    ['', false],
  ])('when the value to be validated is `%j`', (value, expected) => {
    it(`should return ${expected}`, () => {
      expect(validator(value)).toBe(expected);
    });
  });
});

/*
// one
type SortDefinition = Array<{ field: 'name' | 'ip' | 'date'; sort: 'asc' | 'desc' }>;

// two
const sortDef: SortDefinition = [
  {
    field: 'name',
    sort: 'asc',
  },
  {
    field: 'date',
    sort: 'desc',
  },
];

// three
import { encode } from 'rison-node';
const urlSearchParams = new URLSearchParams();
urlSearchParams.set('sort', encode(sortDef));
const newQueryString = urlSearchParams.toString();

// four
import { decode } from 'rison-node';
*/
