/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventHit } from '../search_strategy';
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
          field: 'crazy.pants',
          values: [
            '{"matched.field":["matched_field"],"first_seen":["2021-02-22T17:29:25.195Z"],"provider":["yourself"],"type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"],"lazer":[{"lazer":[{"cool":true,"lazer":[{"lazer":[{"lazer":[{"lazer":[{"whoa":false}]}]}]}]}]},{"lazer":[{"cool":false}]}]},{"great.field":["grrrrr_2"]}]}',
          ],
          originalValue: [
            '{"matched.field":["matched_field"],"first_seen":["2021-02-22T17:29:25.195Z"],"provider":["yourself"],"type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"],"lazer":[{"lazer":[{"cool":true,"lazer":[{"lazer":[{"lazer":[{"lazer":[{"whoa":false}]}]}]}]}]},{"lazer":[{"cool":false}]}]},{"great.field":["grrrrr_2"]}]}',
          ],
          isObjectArray: true,
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
