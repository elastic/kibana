/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { GCP } from '../gcp';

describe('GCP', () => {
  it('is named "gcp"', () => {
    expect(GCP.getName()).to.eql('gcp');
  });

  describe('_checkIfService', () => {
    // GCP responds with the header that they expect (and request lowercases the header's name)
    const headers = { 'metadata-flavor': 'Google' };

    it('handles expected responses', async () => {
      const metadata = {
        id: 'abcdef',
        'machine-type': 'projects/441331612345/machineTypes/f1-micro',
        zone: 'projects/441331612345/zones/us-fake4-c',
      };
      const request = (req, callback) => {
        const basePath = 'http://169.254.169.254/computeMetadata/v1/instance/';

        expect(req.method).to.eql('GET');
        expect(req.uri.startsWith(basePath)).to.be(true);
        expect(req.headers['Metadata-Flavor']).to.eql('Google');
        expect(req.json).to.eql(false);

        const requestKey = req.uri.substring(basePath.length);
        let body = null;

        if (metadata[requestKey]) {
          body = metadata[requestKey];
        } else {
          expect().fail(`Unknown field requested [${requestKey}]`);
        }

        callback(null, { statusCode: 200, body, headers }, body);
      };
      const response = await GCP._checkIfService(request);

      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: GCP.getName(),
        id: metadata.id,
        region: 'us-fake4',
        vm_type: 'f1-micro',
        zone: 'us-fake4-c',
        metadata: undefined,
      });
    });

    // NOTE: the CloudService method, checkIfService, catches the errors that follow
    it('handles unexpected responses', async () => {
      const request = (_req, callback) => callback(null, { statusCode: 200, headers });

      try {
        await GCP._checkIfService(request);
      } catch (err) {
        // ignored
        return;
      }

      expect().fail('Method should throw exception (Promise.reject)');
    });

    it('handles unexpected responses without response header', async () => {
      const body = 'xyz';
      const request = (_req, callback) => callback(null, { statusCode: 200, body }, body);

      try {
        await GCP._checkIfService(request);
      } catch (err) {
        // ignored
        return;
      }

      expect().fail('Method should throw exception (Promise.reject)');
    });

    it('handles not running on GCP with error by rethrowing it', async () => {
      const someError = new Error('expected: request failed');
      const failedRequest = (_req, callback) => callback(someError, null);

      try {
        await GCP._checkIfService(failedRequest);

        expect().fail('Method should throw exception (Promise.reject)');
      } catch (err) {
        expect(err.message).to.eql(someError.message);
      }
    });

    it('handles not running on GCP with 404 response by throwing error', async () => {
      const body = 'This is some random error text';
      const failedRequest = (_req, callback) =>
        callback(null, { statusCode: 404, headers, body }, body);

      try {
        await GCP._checkIfService(failedRequest);
      } catch (err) {
        // ignored
        return;
      }

      expect().fail('Method should throw exception (Promise.reject)');
    });

    it('handles not running on GCP with unexpected response by throwing error', async () => {
      const failedRequest = (_req, callback) => callback(null, null);

      try {
        await GCP._checkIfService(failedRequest);
      } catch (err) {
        // ignored
        return;
      }

      expect().fail('Method should throw exception (Promise.reject)');
    });
  });

  describe('_extractValue', () => {
    it('only handles strings', () => {
      expect(GCP._extractValue()).to.be(undefined);
      expect(GCP._extractValue(null, null)).to.be(undefined);
      expect(GCP._extractValue('abc', { field: 'abcxyz' })).to.be(undefined);
      expect(GCP._extractValue('abc', 1234)).to.be(undefined);
      expect(GCP._extractValue('abc/', 'abc/xyz')).to.eql('xyz');
    });

    it('uses the last index of the prefix to truncate', () => {
      expect(GCP._extractValue('abc/', '  \n  123/abc/xyz\t \n')).to.eql('xyz');
    });
  });

  describe('_combineResponses', () => {
    it('parses in expected format', () => {
      const id = '5702733457649812345';
      const machineType = 'projects/441331612345/machineTypes/f1-micro';
      const zone = 'projects/441331612345/zones/us-fake4-c';

      const response = GCP._combineResponses(id, machineType, zone);

      expect(response.getName()).to.eql(GCP.getName());
      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: 'gcp',
        id: '5702733457649812345',
        vm_type: 'f1-micro',
        region: 'us-fake4',
        zone: 'us-fake4-c',
        metadata: undefined,
      });
    });

    it('parses in unexpected format', () => {
      const id = '5702733457649812345';
      // missing prefixes:
      const machineType = 'f1-micro';
      const zone = 'us-fake4-c';

      const response = GCP._combineResponses(id, machineType, zone);

      expect(response.getName()).to.eql(GCP.getName());
      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: 'gcp',
        id: '5702733457649812345',
        vm_type: undefined,
        region: undefined,
        zone: undefined,
        metadata: undefined,
      });
    });

    it('ignores unexpected response body', () => {
      expect(() => GCP._combineResponses()).to.throwException();
      expect(() => GCP._combineResponses(undefined, undefined, undefined)).to.throwException();
      expect(() => GCP._combineResponses(null, null, null)).to.throwException();
      expect(() =>
        GCP._combineResponses({ id: 'x' }, { machineType: 'a' }, { zone: 'b' })
      ).to.throwException();
      expect(() => GCP._combineResponses({ privateIp: 'a.b.c.d' })).to.throwException();
    });
  });
});
