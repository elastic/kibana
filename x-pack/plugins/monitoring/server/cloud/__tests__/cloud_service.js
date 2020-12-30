/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { CloudService } from '../cloud_service';
import { CloudServiceResponse } from '../cloud_response';

describe('CloudService', () => {
  const service = new CloudService('xyz');

  describe('getName', () => {
    it('is named by the constructor', () => {
      expect(service.getName()).to.eql('xyz');
    });
  });

  describe('checkIfService', () => {
    it('is always unconfirmed', async () => {
      const response = await service.checkIfService();

      expect(response.getName()).to.eql('xyz');
      expect(response.isConfirmed()).to.be(false);
    });
  });

  describe('_checkIfService', () => {
    it('throws an exception unless overridden', async () => {
      const request = sinon.stub();

      try {
        await service._checkIfService(request);
      } catch (err) {
        expect(err.message).to.eql('not implemented');
      }
    });
  });

  describe('_createUnconfirmedResponse', () => {
    it('is always unconfirmed', () => {
      const response = service._createUnconfirmedResponse();

      expect(response.getName()).to.eql('xyz');
      expect(response.isConfirmed()).to.be(false);
    });
  });

  describe('_stringToJson', () => {
    it('only handles strings', () => {
      expect(() => service._stringToJson({})).to.throwException();
      expect(() => service._stringToJson(123)).to.throwException();
      expect(() => service._stringToJson(true)).to.throwException();
    });

    it('fails with unexpected values', () => {
      // array
      expect(() => service._stringToJson('[{}]')).to.throwException();
      // normal values
      expect(() => service._stringToJson('true')).to.throwException();
      expect(() => service._stringToJson('123')).to.throwException();
      expect(() => service._stringToJson('xyz')).to.throwException();
      // invalid JSON
      expect(() => service._stringToJson('{"xyz"}')).to.throwException();
      // (single quotes are not actually valid in serialized JSON)
      expect(() => service._stringToJson("{'a': 'xyz'}")).to.throwException();
      expect(() => service._stringToJson('{{}')).to.throwException();
      expect(() => service._stringToJson('{}}')).to.throwException();
    });

    it('parses objects', () => {
      const testObject = {
        arbitrary: {
          nesting: {
            works: [1, 2, '3'],
          },
        },
        bool: true,
        and: false,
        etc: 'abc',
      };

      expect(service._stringToJson(' {} ')).to.eql({});
      expect(service._stringToJson('{ "a" : "key" }\n')).to.eql({ a: 'key' });
      expect(service._stringToJson(JSON.stringify(testObject))).to.eql(testObject);
    });
  });

  describe('_parseResponse', () => {
    const body = { some: { body: {} } };
    const tryParseResponse = async (...args) => {
      try {
        await service._parseResponse(...args);
      } catch (err) {
        // expected
        return;
      }

      expect().fail('Should throw exception');
    };

    it('throws error upon failure to parse body as object', async () => {
      // missing body
      await tryParseResponse();
      await tryParseResponse(null);
      await tryParseResponse({});
      await tryParseResponse(123);
      await tryParseResponse('raw string');
      // malformed JSON object
      await tryParseResponse('{{}');
    });

    it('expects unusable bodies', async () => {
      const parseBody = (parsedBody) => {
        expect(parsedBody).to.eql(body);

        return null;
      };

      await tryParseResponse(JSON.stringify(body), parseBody);
      await tryParseResponse(body, parseBody);
    });

    it('uses parsed object to create response', async () => {
      const serviceResponse = new CloudServiceResponse('a123', true, { id: 'xyz' });
      const parseBody = (parsedBody) => {
        expect(parsedBody).to.eql(body);

        return serviceResponse;
      };

      const response = await service._parseResponse(body, parseBody);

      expect(response).to.be(serviceResponse);
    });
  });
});
