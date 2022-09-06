/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateFromQueryParams } from './utils';

describe('encodeState()', () => {});

describe('stateFromQueryParams()', () => {
  it('should return valid state object from invalid query', () => {
    expect(stateFromQueryParams('')).toMatchObject({
      filterQuery: expect.any(Object),
      timeRange: expect.any(Object),
      filters: expect.any(Array),
    });
  });

  it('should return valid state when indicators fields is invalid', () => {
    expect(stateFromQueryParams('?indicators=')).toMatchObject({
      filterQuery: expect.any(Object),
      timeRange: expect.any(Object),
      filters: expect.any(Array),
    });
  });

  it('should deserialize valid query state', () => {
    expect(
      stateFromQueryParams(
        '?indicators=(filterQuery:(language:kuery,query:%27threat.indicator.type%20:%20"file"%20or%20threat.indicator.type%20:%20"url"%20%27),filters:!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:_id,negate:!f,type:exists,value:exists),query:(exists:(field:_id)))),timeRange:(from:now-1y/d,to:now))'
      )
    ).toMatchInlineSnapshot(`
      Object {
        "filterQuery": Object {
          "language": "kuery",
          "query": "threat.indicator.type : \\"file\\" or threat.indicator.type : \\"url\\" ",
        },
        "filters": Array [
          Object {
            "$state": Object {
              "store": "appState",
            },
            "meta": Object {
              "alias": null,
              "disabled": false,
              "index": "",
              "key": "_id",
              "negate": false,
              "type": "exists",
              "value": "exists",
            },
            "query": Object {
              "exists": Object {
                "field": "_id",
              },
            },
          },
        ],
        "timeRange": Object {
          "from": "now-1y/d",
          "to": "now",
        },
      }
    `);
  });
});
