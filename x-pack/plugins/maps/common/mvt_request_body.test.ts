/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeMvtResponseBody,
  encodeMvtResponseBody,
  getAggsTileRequest,
  getHitsTileRequest,
} from './mvt_request_body';
import { RENDER_AS } from './constants';

describe('decodeMvtResponseBody', () => {
  test('Should encode shape into URI safe string and decode back to original shape', () => {
    const searchRequest = {
      docvalue_fields: [],
      size: 10000,
      _source: false,
      script_fields: {},
      stored_fields: ['geopoint'],
      runtime_mappings: {
        'day of week': {
          type: 'keyword',
          script: {
            source:
              "ZonedDateTime input = doc['ISSUE_DATE'].value;\nString output = input.format(DateTimeFormatter.ofPattern('e')) + ' ' + input.format(DateTimeFormatter.ofPattern('E'));\nemit(output);",
          },
        },
      },
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
    };
    const encodedSearchRequest = encodeMvtResponseBody(searchRequest);
    expect(encodedSearchRequest).toBe(
      `(_source%3A!f%2Cdocvalue_fields%3A!()%2Cquery%3A(bool%3A(filter%3A!()%2Cmust%3A!()%2Cmust_not%3A!()%2Cshould%3A!()))%2Cruntime_mappings%3A('day%20of%20week'%3A(script%3A(source%3A'ZonedDateTime%20input%20%3D%20doc%5B!'ISSUE_DATE!'%5D.value%3B%0AString%20output%20%3D%20input.format(DateTimeFormatter.ofPattern(!'e!'))%20%2B%20!'%20!'%20%2B%20input.format(DateTimeFormatter.ofPattern(!'E!'))%3B%0Aemit(output)%3B')%2Ctype%3Akeyword))%2Cscript_fields%3A()%2Csize%3A10000%2Cstored_fields%3A!(geopoint))`
    );
    expect(decodeMvtResponseBody(encodedSearchRequest)).toEqual(searchRequest);
  });

  test(`Should handle '%' character`, () => {
    const runtimeFieldScript = `if (doc['price'].size() != 0){
    String tmp=dissect('$%{price}').extract(doc["price"].value)?.price;

    tmp = tmp.replace(',','');

    def pn = Double.parseDouble( tmp );

    if (pn != null) emit(pn);
  }
  else { 
    emit(0)
  }`;
    const searchRequest = {
      size: 10000,
      _source: false,
      runtime_mappings: {
        price_as_number: {
          type: 'keyword',
          script: {
            source: runtimeFieldScript,
          },
        },
      },
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
    };
    const encodedSearchRequest = encodeMvtResponseBody(searchRequest);
    expect(decodeMvtResponseBody(encodedSearchRequest)).toEqual(searchRequest);
  });
});

describe('getAggsTileRequest', () => {
  test(`Should URL encode path parameters`, () => {
    const searchRequest = {
      aggs: {},
      runtime_mappings: {},
      query: {},
    };
    const { path } = getAggsTileRequest({
      encodedRequestBody: encodeMvtResponseBody(searchRequest),
      geometryFieldName: 'my location',
      gridPrecision: 8,
      hasLabels: true,
      index: 'my index',
      renderAs: RENDER_AS.POINT,
      x: 0,
      y: 0,
      z: 0,
    });
    expect(path).toEqual('/my%20index/_mvt/my%20location/0/0/0');
  });
});

describe('getHitsTileRequest', () => {
  test(`Should URL encode path parameters`, () => {
    const searchRequest = {
      size: 10000,
      runtime_mappings: {},
      query: {},
    };
    const { path } = getHitsTileRequest({
      encodedRequestBody: encodeMvtResponseBody(searchRequest),
      geometryFieldName: 'my location',
      hasLabels: true,
      index: 'my index',
      x: 0,
      y: 0,
      z: 0,
    });
    expect(path).toEqual('/my%20index/_mvt/my%20location/0/0/0');
  });
});
