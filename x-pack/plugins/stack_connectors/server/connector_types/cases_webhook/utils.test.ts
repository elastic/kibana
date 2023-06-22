/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getObjectValueByKeyAsString,
  stringifyObjValues,
  throwDescriptiveErrorIfResponseIsNotValid,
} from './utils';

const bigOlObject = {
  fields: {
    id: [
      {
        good: {
          cool: 'cool',
        },
      },
      {
        more: [
          {
            more: {
              complicated: 'complicated',
            },
          },
        ],
      },
    ],
  },
  field: {
    simple: 'simple',
  },
};
describe('cases_webhook/utils', () => {
  describe('getObjectValueByKeyAsString()', () => {
    it('Handles a simple key', () => {
      expect(getObjectValueByKeyAsString(bigOlObject, 'field.simple')).toEqual('simple');
    });
    it('Handles a complicated key', () => {
      expect(getObjectValueByKeyAsString(bigOlObject, 'fields.id[0].good.cool')).toEqual('cool');
    });
    it('Handles a more complicated key', () => {
      expect(
        getObjectValueByKeyAsString(bigOlObject, 'fields.id[1].more[0].more.complicated')
      ).toEqual('complicated');
    });
    it('Handles a bad key', () => {
      expect(getObjectValueByKeyAsString(bigOlObject, 'bad.key')).toEqual(undefined);
    });
  });
  describe('throwDescriptiveErrorIfResponseIsNotValid()', () => {
    const res = {
      data: bigOlObject,
      headers: {},
      status: 200,
      statusText: 'hooray',
      config: {
        method: 'post',
        url: 'https://poster.com',
      },
    };
    it('Throws error when missing content-type', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res,
          requiredAttributesToBeInTheResponse: ['field.simple'],
        })
      ).toThrow(
        'Missing content type header in post https://poster.com. Supported content types: application/json'
      );
    });
    it('Throws error when content-type is not valid', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res: {
            ...res,
            headers: {
              ['content-type']: 'not/cool',
            },
          },
          requiredAttributesToBeInTheResponse: ['field.simple'],
        })
      ).toThrow(
        'Unsupported content type: not/cool in post https://poster.com. Supported content types: application/json'
      );
    });
    it('Throws error for bad data', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res: {
            ...res,
            headers: {
              ['content-type']: 'application/json',
            },
            data: 'bad',
          },
          requiredAttributesToBeInTheResponse: ['field.simple'],
        })
      ).toThrow('Response is not a valid JSON');
    });
    it('Throws for bad key', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res: {
            ...res,
            headers: {
              ['content-type']: 'application/json',
            },
          },
          requiredAttributesToBeInTheResponse: ['bad.key'],
        })
      ).toThrow('Response is missing the expected field: bad.key');
    });
    it('Throws for multiple bad keys', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res: {
            ...res,
            headers: {
              ['content-type']: 'application/json',
            },
          },
          requiredAttributesToBeInTheResponse: ['bad.key', 'bad.again'],
        })
      ).toThrow('Response is missing the expected fields: bad.key, bad.again');
    });
    it('Does not throw for valid key', () => {
      expect(() =>
        throwDescriptiveErrorIfResponseIsNotValid({
          res: {
            ...res,
            headers: {
              ['content-type']: 'application/json',
            },
          },
          requiredAttributesToBeInTheResponse: ['fields.id[0].good.cool'],
        })
      ).not.toThrow();
    });
  });
  describe('stringifyObjValues()', () => {
    const caseObj = {
      title: 'title',
      description: 'description',
      labels: ['cool', 'rad', 'awesome'],
      comment: 'comment',
    };
    it('Handles a case object', () => {
      expect(stringifyObjValues(caseObj)).toEqual({
        case: {
          comment: '"comment"',
          description: '"description"',
          labels: '["cool","rad","awesome"]',
          title: '"title"',
        },
      });
    });
  });
});
