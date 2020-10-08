/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatProductName, getIdentifier } from './formatting';
import {
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../../common/constants';

const PRODUCTS = [
  {
    name: ELASTICSEARCH_SYSTEM_ID,
  },
  {
    name: KIBANA_SYSTEM_ID,
  },
  {
    name: LOGSTASH_SYSTEM_ID,
  },
  {
    name: BEATS_SYSTEM_ID,
  },
  {
    name: APM_SYSTEM_ID,
  },
];

describe('setupMode formatting', () => {
  describe('formatProductName', () => {
    for (const { name } of PRODUCTS) {
      it(`should format the product name for ${name}`, () => {
        expect(formatProductName(name)).toMatchSnapshot();
      });
    }
  });
  describe('getIdentifier', () => {
    for (const { name } of PRODUCTS) {
      it(`should get the singular identifier for ${name}`, () => {
        expect(getIdentifier(name)).toMatchSnapshot();
      });
      it(`should get the plural identifier for ${name}`, () => {
        expect(getIdentifier(name, true)).toMatchSnapshot();
      });
    }
  });
});
