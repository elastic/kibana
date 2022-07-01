/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventHit } from '../search_strategy';
import { getDataFromFieldsHits, getDataSafety } from './field_formatters';
import { eventDetailsFormattedFields, eventHit } from '@kbn/securitysolution-t-grid';

describe('Events Details Helpers', () => {
  const fields: EventHit['fields'] = eventHit.fields;
  const resultFields = eventDetailsFormattedFields;
  describe('#getDataFromFieldsHits', () => {
    it('happy path', () => {
      const result = getDataFromFieldsHits(fields);
      expect(result).toEqual(resultFields);
    });
    it('lets get weird', () => {
      const whackFields = {
        'crazy.pants': [
          {
            'matched.field': ['matched_field'],
            first_seen: ['2021-02-22T17:29:25.195Z'],
            provider: ['yourself'],
            type: ['custom'],
            'matched.atomic': ['matched_atomic'],
            lazer: [
              {
                'great.field': ['grrrrr'],
                lazer: [
                  {
                    lazer: [
                      {
                        cool: true,
                        lazer: [
                          {
                            lazer: [
                              {
                                lazer: [
                                  {
                                    lazer: [
                                      {
                                        whoa: false,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    lazer: [
                      {
                        cool: false,
                      },
                    ],
                  },
                ],
              },
              {
                'great.field': ['grrrrr_2'],
              },
            ],
          },
        ],
      };
      const whackResultFields = [
        {
          category: 'crazy',
          field: 'crazy.pants.matched.field',
          values: ['matched_field'],
          originalValue: ['matched_field'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.first_seen',
          values: ['2021-02-22T17:29:25.195Z'],
          originalValue: ['2021-02-22T17:29:25.195Z'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.provider',
          values: ['yourself'],
          originalValue: ['yourself'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.type',
          values: ['custom'],
          originalValue: ['custom'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.matched.atomic',
          values: ['matched_atomic'],
          originalValue: ['matched_atomic'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.great.field',
          values: ['grrrrr', 'grrrrr_2'],
          originalValue: ['grrrrr', 'grrrrr_2'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.lazer.lazer.cool',
          values: ['true', 'false'],
          originalValue: ['true', 'false'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.lazer.lazer.lazer.lazer.lazer.lazer.whoa',
          values: ['false'],
          originalValue: ['false'],
          isObjectArray: false,
        },
      ];
      const result = getDataFromFieldsHits(whackFields);
      expect(result).toEqual(whackResultFields);
    });
  });
  it('#getDataSafety', async () => {
    const result = await getDataSafety(getDataFromFieldsHits, fields);
    expect(result).toEqual(resultFields);
  });
});
