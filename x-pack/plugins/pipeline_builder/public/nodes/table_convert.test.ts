/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { getFlattenedArrayPaths, convertToTable, recursiveFlatten, getPath } from './table_convert';
import { getFlattenedArrayPaths, convertToTable, getPath, collectRows } from './table_convert';

describe('flatten', () => {
  const jsonInput = {
    buckets: [
      {
        key_as_string: '2020-04-26T00:00:00.000Z',
        key: 1587859200000,
        doc_count: 100,
        bytes_avg: {
          value: 6802.12,
        },
        buckets: [
          {
            key: 'US',
            doc_count: 29,
          },
          {
            key: 'CN',
            doc_count: 18,
          },
        ],
      },
      {
        key_as_string: '2020-04-27T00:00:00.000Z',
        key: 1587945600000,
        doc_count: 340,
        bytes_avg: {
          value: 10202.12,
        },
        buckets: [
          {
            key: 'US',
            doc_count: 32,
          },
          {
            key: 'IN',
            doc_count: 30,
          },
        ],
      },
    ],
  };

  const sourceInput = {
    _index: 'kibana_sample_data_ecommerce',
    _id: 'KsuK8HEBf9u60pLx7VXX',
    _version: 1,
    _score: null,
    _source: {
      category: ["Men's Shoes", "Men's Accessories"],
      currency: 'EUR',
      customer_first_name: 'Irwin',
      customer_full_name: 'Irwin Taylor',
      customer_gender: 'MALE',
      customer_id: 14,
      customer_last_name: 'Taylor',
      customer_phone: '',
      day_of_week: 'Thursday',
      day_of_week_i: 3,
      email: 'irwin@taylor-family.zzz',
      manufacturer: ['Low Tide Media'],
      order_date: '2020-05-14T19:39:22+00:00',
      order_id: 579751,
      products: [
        {
          base_price: 49.99,
          discount_percentage: 0,
          quantity: 1,
          manufacturer: 'Low Tide Media',
          tax_amount: 0,
          product_id: 24268,
          category: "Men's Shoes",
          sku: 'ZO0403104031',
          taxless_price: 49.99,
          unit_discount_amount: 0,
          min_price: 25.99,
          _id: 'sold_product_579751_24268',
          discount_amount: 0,
          created_on: '2016-12-22T19:39:22+00:00',
          product_name: 'Boots - Gold',
          price: 49.99,
          taxful_price: 49.99,
          base_unit_price: 49.99,
        },
        {
          base_price: 16.99,
          discount_percentage: 0,
          quantity: 1,
          manufacturer: 'Low Tide Media',
          tax_amount: 0,
          product_id: 11748,
          category: "Men's Accessories",
          sku: 'ZO0462204622',
          taxless_price: 16.99,
          unit_discount_amount: 0,
          min_price: 8.33,
          _id: 'sold_product_579751_11748',
          discount_amount: 0,
          created_on: '2016-12-22T19:39:22+00:00',
          product_name: 'Wallet - grey',
          price: 16.99,
          taxful_price: 16.99,
          base_unit_price: 16.99,
        },
      ],
      sku: ['ZO0403104031', 'ZO0462204622'],
      taxful_total_price: 66.98,
      taxless_total_price: 66.98,
      total_quantity: 2,
      total_unique_products: 2,
      type: 'order',
      user: 'irwin',
      geoip: {
        country_iso_code: 'CO',
        location: {
          lon: -74.1,
          lat: 4.6,
        },
        region_name: 'Bogota D.C.',
        continent_name: 'South America',
        city_name: 'Bogotu00e1',
      },
    },
    fields: {
      customer_birth_date: [],
      order_date: ['2020-05-14T19:39:22.000Z'],
      'products.created_on': ['2016-12-22T19:39:22.000Z', '2016-12-22T19:39:22.000Z'],
    },
    sort: [1589485162000],
  };

  const sqlInput = {
    columns: [
      {
        name: `'geo.src'`,
        type: 'keyword',
      },
      {
        name: 'bytes',
        type: 'long',
      },
    ],

    rows: [
      ['CN', 5133],
      ['IR', 7503],
      ['ET', 3064],
    ],
  };

  describe('getFlattenedArrayPaths', () => {
    it('should find the dotted paths in json', () => {
      expect(getFlattenedArrayPaths(jsonInput)).toEqual([
        'buckets.key_as_string',
        'buckets.key',
        'buckets.doc_count',
        'buckets.bytes_avg.value',
        'buckets.buckets.key',
        'buckets.buckets.doc_count',
      ]);
    });

    it('should find the dotted paths in source', () => {
      expect(getFlattenedArrayPaths(sourceInput)).toEqual([
        '_index',
        '_id',
        '_version',
        '_score',
        '_source.currency',
        '_source.customer_first_name',
        '_source.customer_full_name',
        '_source.customer_gender',
        '_source.customer_id',
        '_source.customer_last_name',
        '_source.customer_phone',
        '_source.day_of_week',
        '_source.day_of_week_i',
        '_source.email',
        '_source.order_date',
        '_source.order_id',
        '_source.products.base_price',
        '_source.products.discount_percentage',
        '_source.products.quantity',
        '_source.products.manufacturer',
        '_source.products.tax_amount',
        '_source.products.product_id',
        '_source.products.category',
        '_source.products.sku',
        '_source.products.taxless_price',
        '_source.products.unit_discount_amount',
        '_source.products.min_price',
        '_source.products._id',
        '_source.products.discount_amount',
        '_source.products.created_on',
        '_source.products.product_name',
        '_source.products.price',
        '_source.products.taxful_price',
        '_source.products.base_unit_price',
        '_source.taxful_total_price',
        '_source.taxless_total_price',
        '_source.total_quantity',
        '_source.total_unique_products',
        '_source.type',
        '_source.user',
        '_source.geoip.country_iso_code',
        '_source.geoip.location.lon',
        '_source.geoip.location.lat',
        '_source.geoip.region_name',
        '_source.geoip.continent_name',
        '_source.geoip.city_name',
      ]);
    });

    it('should find the dotted paths in sql', () => {
      expect(getFlattenedArrayPaths(sqlInput)).toEqual([
        'columns.name',
        'columns.type',
        'rows.0',
        'rows.1',
      ]);
    });

    it('should find the dotted paths in arrays', () => {
      expect(
        getFlattenedArrayPaths([
          ['CN', 124],
          ['US', 6021],
        ])
      ).toEqual(['.0', '.1']);
    });
  });

  // describe('should convert to rows and columns', () => {
  //   it('should convert json', () => {
  //     expect(convertToTable(jsonInput)).toEqual({
  //       columns: [{}],
  //     });
  //   });
  // });

  /* describe('recursive flattening', () => {
    it('should return one row for primitive', () => {
      expect(recursiveFlatten(500)).toEqual(500);
    });

    it('should return one row for each value of an array', () => {
      expect(recursiveFlatten([9, 8])).toEqual([9, 8]);
    });

    it('should return one row for simple object', () => {
      expect(recursiveFlatten({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    });

    it('should reduce single-item arrays', () => {
      expect(recursiveFlatten(['a'])).toEqual('a');
    });

    it('should go into sub-objects', () => {
      expect(recursiveFlatten({ count: 5, a: { b: [2] } })).toEqual({ count: 5, 'a.b': 2 });
    });

    it('should go into arrays with sub-objects', () => {
      expect(
        recursiveFlatten([
          { count: 5, a: { b: 2 } },
          { count: 2, a: { b: [4, 2] } },
        ])
      ).toEqual([
        { count: 5, 'a.b': 2 },
        { count: 2, 'a.b': [4, 2] },
      ]);
    });

    // it('should not modify nested arrays', () => {
    //   expect(
    //     recursiveFlatten([
    //       ['CN', 124],
    //       ['US', 6021],
    //     ])
    //   ).toEqual([
    //     ['CN', 124],
    //     ['US', 6021],
    //   ]);
    // });

    it('should work with arrays of objects', () => {
      expect(recursiveFlatten({ buckets: [{ a: 1 }, { b: 2 }] })).toEqual([
        { buckets: { a: 1 } },
        { buckets: { b: 2 } },
      ]);
    });

    it('should work with inner nested buckets', () => {
      expect(recursiveFlatten([{ buckets: [{ key: 'A' }] }])).toEqual({
        'buckets.key': 'A',
      });
    });

    it('should work with nested buckets', () => {
      expect(recursiveFlatten({ buckets: [{ buckets: [{ key: 'A' }] }] })).toEqual({
        'buckets.buckets.key': 'A',
      });
    });

    it('should work on real inputs', () => {
      expect(recursiveFlatten(jsonInput)).toMatchInlineSnapshot(`
        Array [
          Object {
            "buckets": Array [
              Object {
                "buckets": Object {
                  "doc_count": 29,
                  "key": "US",
                },
                "bytes_avg.value": 6802.12,
                "doc_count": 100,
                "key": 1587859200000,
                "key_as_string": "2020-04-26T00:00:00.000Z",
              },
              Object {
                "buckets": Object {
                  "doc_count": 18,
                  "key": "CN",
                },
                "bytes_avg.value": 6802.12,
                "doc_count": 100,
                "key": 1587859200000,
                "key_as_string": "2020-04-26T00:00:00.000Z",
              },
            ],
          },
          Object {
            "buckets": Array [
              Object {
                "buckets": Object {
                  "doc_count": 32,
                  "key": "US",
                },
                "bytes_avg.value": 10202.12,
                "doc_count": 340,
                "key": 1587945600000,
                "key_as_string": "2020-04-27T00:00:00.000Z",
              },
              Object {
                "buckets": Object {
                  "doc_count": 30,
                  "key": "IN",
                },
                "bytes_avg.value": 10202.12,
                "doc_count": 340,
                "key": 1587945600000,
                "key_as_string": "2020-04-27T00:00:00.000Z",
              },
            ],
          },
        ]
      `);
    });
  });*/

  describe('getPath', () => {
    it('should return one row for simple object', () => {
      expect(getPath({ a: 1, b: 2 }, ['a'])).toEqual([1]);
    });

    it('should reduce single-item arrays', () => {
      expect(getPath(['a'], ['0'])).toEqual(['a']);
    });

    it('should go into sub-objects', () => {
      expect(getPath({ count: 5, a: { b: [2] } }, ['a', 'b'])).toEqual([2]);
    });

    it('should go into arrays with sub-objects', () => {
      expect(
        getPath(
          [
            { count: 5, a: { b: 2 } },
            { count: 2, a: { b: [4, 2] } },
          ],
          ['a', 'b']
        )
      ).toEqual([2, 4, 2]);
    });

    // it('should not modify nested arrays', () => {
    //   expect(
    //     getPath([
    //       ['CN', 124],
    //       ['US', 6021],
    //     ])
    //   ).toEqual([
    //     ['CN', 124],
    //     ['US', 6021],
    //   ]);
    // });

    it('should work with arrays of objects', () => {
      expect(getPath({ buckets: [{ a: 1 }, { b: 2 }] }, ['buckets', 'a'])).toEqual([1]);
    });

    it('should work with inner nested buckets', () => {
      expect(getPath([{ buckets: [{ key: 'A' }] }], ['buckets', 'key'])).toEqual(['A']);
    });

    it('should work with nested buckets', () => {
      expect(
        getPath({ buckets: [{ buckets: [{ key: 'A' }] }] }, 'buckets.buckets.key'.split('.'))
      ).toEqual(['A']);
    });

    it('should work with mixed dotted and non-dotted fields', () => {
      expect(getPath({ 'a.b': 1, a: { b: 2 } }, ['a', 'b'])).toEqual([1, 2]);
    });

    it('should get sample buckets', () => {
      expect(getPath(jsonInput, 'buckets.buckets.key'.split('.'))).toEqual([
        'US',
        'CN',
        'US',
        'IN',
      ]);
    });

    it('should get sql positional values', () => {
      expect(getPath(sqlInput, 'rows.0'.split('.'))).toEqual(['CN', 'IR', 'ET']);
    });

    it('should fall back to complex objects', () => {
      expect(getPath(jsonInput, ['buckets', 'buckets'])).toHaveLength(4);
    });

    it('should get values from json', () => {
      const paths = getFlattenedArrayPaths(jsonInput);
      const collectedPaths = paths.map(p => ({ [p]: getPath(jsonInput, p.split('.')) }));
      expect(collectedPaths).toMatchInlineSnapshot(`
        Array [
          Object {
            "buckets.key_as_string": Array [
              "2020-04-26T00:00:00.000Z",
              "2020-04-27T00:00:00.000Z",
            ],
          },
          Object {
            "buckets.key": Array [
              1587859200000,
              1587945600000,
            ],
          },
          Object {
            "buckets.doc_count": Array [
              100,
              340,
            ],
          },
          Object {
            "buckets.bytes_avg.value": Array [
              6802.12,
              10202.12,
            ],
          },
          Object {
            "buckets.buckets.key": Array [
              "US",
              "CN",
              "US",
              "IN",
            ],
          },
          Object {
            "buckets.buckets.doc_count": Array [
              29,
              18,
              32,
              30,
            ],
          },
        ]
      `);
    });

    it('should get values from source', () => {
      const paths = getFlattenedArrayPaths(sourceInput);
      const collectedPaths = paths.map(p => ({ [p]: getPath(sourceInput, p.split('.')) }));
      expect(collectedPaths).toMatchInlineSnapshot(`
        Array [
          Object {
            "_index": Array [
              "kibana_sample_data_ecommerce",
            ],
          },
          Object {
            "_id": Array [
              "KsuK8HEBf9u60pLx7VXX",
            ],
          },
          Object {
            "_version": Array [
              1,
            ],
          },
          Object {
            "_score": Array [],
          },
          Object {
            "_source.currency": Array [
              "EUR",
            ],
          },
          Object {
            "_source.customer_first_name": Array [
              "Irwin",
            ],
          },
          Object {
            "_source.customer_full_name": Array [
              "Irwin Taylor",
            ],
          },
          Object {
            "_source.customer_gender": Array [
              "MALE",
            ],
          },
          Object {
            "_source.customer_id": Array [
              14,
            ],
          },
          Object {
            "_source.customer_last_name": Array [
              "Taylor",
            ],
          },
          Object {
            "_source.customer_phone": Array [
              "",
            ],
          },
          Object {
            "_source.day_of_week": Array [
              "Thursday",
            ],
          },
          Object {
            "_source.day_of_week_i": Array [
              3,
            ],
          },
          Object {
            "_source.email": Array [
              "irwin@taylor-family.zzz",
            ],
          },
          Object {
            "_source.order_date": Array [
              "2020-05-14T19:39:22+00:00",
            ],
          },
          Object {
            "_source.order_id": Array [
              579751,
            ],
          },
          Object {
            "_source.products.base_price": Array [
              49.99,
              16.99,
            ],
          },
          Object {
            "_source.products.discount_percentage": Array [
              0,
              0,
            ],
          },
          Object {
            "_source.products.quantity": Array [
              1,
              1,
            ],
          },
          Object {
            "_source.products.manufacturer": Array [
              "Low Tide Media",
              "Low Tide Media",
            ],
          },
          Object {
            "_source.products.tax_amount": Array [
              0,
              0,
            ],
          },
          Object {
            "_source.products.product_id": Array [
              24268,
              11748,
            ],
          },
          Object {
            "_source.products.category": Array [
              "Men's Shoes",
              "Men's Accessories",
            ],
          },
          Object {
            "_source.products.sku": Array [
              "ZO0403104031",
              "ZO0462204622",
            ],
          },
          Object {
            "_source.products.taxless_price": Array [
              49.99,
              16.99,
            ],
          },
          Object {
            "_source.products.unit_discount_amount": Array [
              0,
              0,
            ],
          },
          Object {
            "_source.products.min_price": Array [
              25.99,
              8.33,
            ],
          },
          Object {
            "_source.products._id": Array [
              "sold_product_579751_24268",
              "sold_product_579751_11748",
            ],
          },
          Object {
            "_source.products.discount_amount": Array [
              0,
              0,
            ],
          },
          Object {
            "_source.products.created_on": Array [
              "2016-12-22T19:39:22+00:00",
              "2016-12-22T19:39:22+00:00",
            ],
          },
          Object {
            "_source.products.product_name": Array [
              "Boots - Gold",
              "Wallet - grey",
            ],
          },
          Object {
            "_source.products.price": Array [
              49.99,
              16.99,
            ],
          },
          Object {
            "_source.products.taxful_price": Array [
              49.99,
              16.99,
            ],
          },
          Object {
            "_source.products.base_unit_price": Array [
              49.99,
              16.99,
            ],
          },
          Object {
            "_source.taxful_total_price": Array [
              66.98,
            ],
          },
          Object {
            "_source.taxless_total_price": Array [
              66.98,
            ],
          },
          Object {
            "_source.total_quantity": Array [
              2,
            ],
          },
          Object {
            "_source.total_unique_products": Array [
              2,
            ],
          },
          Object {
            "_source.type": Array [
              "order",
            ],
          },
          Object {
            "_source.user": Array [
              "irwin",
            ],
          },
          Object {
            "_source.geoip.country_iso_code": Array [
              "CO",
            ],
          },
          Object {
            "_source.geoip.location.lon": Array [
              -74.1,
            ],
          },
          Object {
            "_source.geoip.location.lat": Array [
              4.6,
            ],
          },
          Object {
            "_source.geoip.region_name": Array [
              "Bogota D.C.",
            ],
          },
          Object {
            "_source.geoip.continent_name": Array [
              "South America",
            ],
          },
          Object {
            "_source.geoip.city_name": Array [
              "Bogotu00e1",
            ],
          },
        ]
      `);
    });

    it('should get values from sql', () => {
      const paths = getFlattenedArrayPaths(sqlInput);
      const collectedPaths = paths.map(p => ({ [p]: getPath(sqlInput, p.split('.')) }));
      expect(collectedPaths).toMatchInlineSnapshot(`
        Array [
          Object {
            "columns.name": Array [
              "'geo.src'",
              "bytes",
            ],
          },
          Object {
            "columns.type": Array [
              "keyword",
              "long",
            ],
          },
          Object {
            "rows.0": Array [
              "CN",
              "IR",
              "ET",
            ],
          },
          Object {
            "rows.1": Array [
              5133,
              7503,
              3064,
            ],
          },
        ]
      `);
    });
  });

  describe('collectColumns', () => {
    it('should return one row for simple object', () => {
      expect(collectRows({ a: 1, b: 2 }, ['a', 'b'])).toEqual([{ a: 1, b: 2 }]);
    });

    // it('should reduce single-item arrays', () => {
    //   expect(getPath(['a'], ['0'])).toEqual(['a']);
    // });

    // it('should go into sub-objects', () => {
    //   expect(getPath({ count: 5, a: { b: [2] } }, ['a', 'b'])).toEqual([2]);
    // });

    it('should expand different length arrays', () => {
      expect(
        collectRows({ count: 10, buckets: [{ a: { b: 3 } }, { a: { b: [4, 2] } }] }, [
          'count',
          'buckets.a.b',
        ])
      ).toEqual([
        { count: 10, 'buckets.a.b': 3 },
        { count: 10, 'buckets.a.b': 4 },
        { count: 10, 'buckets.a.b': 2 },
      ]);
    });

    it('should create partial objects if lengths are not equal', () => {
      expect(
        collectRows({ count: 10, buckets: [{ a: { b: 3 } }, { a: { b: [4, 2] } }] }, [
          'count',
          'buckets.a.b',
        ])
      ).toEqual([
        { count: 10, 'buckets.a.b': 3 },
        { count: 10, 'buckets.a.b': 4 },
        { count: 10, 'buckets.a.b': 2 },
      ]);
    });

    // it('should not modify nested arrays', () => {
    //   expect(
    //     getPath([
    //       ['CN', 124],
    //       ['US', 6021],
    //     ])
    //   ).toEqual([
    //     ['CN', 124],
    //     ['US', 6021],
    //   ]);
    // });

    // it('should work with arrays of objects', () => {
    //   expect(getPath({ buckets: [{ a: 1 }, { b: 2 }] }, ['buckets', 'a'])).toEqual([1]);
    // });

    // it('should work with inner nested buckets', () => {
    //   expect(getPath([{ buckets: [{ key: 'A' }] }], ['buckets', 'key'])).toEqual(['A']);
    // });

    // it('should work with nested buckets', () => {
    //   expect(
    //     getPath({ buckets: [{ buckets: [{ key: 'A' }] }] }, 'buckets.buckets.key'.split('.'))
    //   ).toEqual(['A']);
    // });

    // it('should work with mixed dotted and non-dotted fields', () => {
    //   expect(getPath({ 'a.b': 1, a: { b: 2 } }, ['a', 'b'])).toEqual([1, 2]);
    // });

    // it('should get sample buckets', () => {
    //   expect(getPath(jsonInput, 'buckets.buckets.key'.split('.'))).toEqual([
    //     'US',
    //     'CN',
    //     'US',
    //     'IN',
    //   ]);
    // });

    // it('should get sql positional values', () => {
    //   expect(getPath(sqlInput, 'rows.0'.split('.'))).toEqual(['CN', 'IR', 'ET']);
    // });
  });
});
