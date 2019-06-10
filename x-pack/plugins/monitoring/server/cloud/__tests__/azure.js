/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { AZURE } from '../azure';

describe('Azure', () => {
  it('is named "azure"', () => {
    expect(AZURE.getName()).to.eql('azure');
  });

  describe('_checkIfService', () => {
    it('handles expected response', async () => {
      const id = 'abcdef';
      const request = (req, callback) => {
        expect(req.method).to.eql('GET');
        expect(req.uri).to.eql('http://169.254.169.254/metadata/instance?api-version=2017-04-02');
        expect(req.headers.Metadata).to.eql('true');
        expect(req.json).to.eql(true);

        const body = `{"compute":{"vmId": "${id}","location":"fakeus","availabilityZone":"fakeus-2"}}`;

        callback(null, { statusCode: 200, body }, body);
      };
      const response = await AZURE._checkIfService(request);

      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: AZURE.getName(),
        id,
        region: 'fakeus',
        vm_type: undefined,
        zone: undefined,
        metadata: {
          availabilityZone: 'fakeus-2'
        }
      });
    });

    // NOTE: the CloudService method, checkIfService, catches the errors that follow
    it('handles not running on Azure with error by rethrowing it', async () => {
      const someError = new Error('expected: request failed');
      const failedRequest = (_req, callback) => callback(someError, null);

      try {
        await AZURE._checkIfService(failedRequest);

        expect().fail('Method should throw exception (Promise.reject)');
      } catch (err) {
        expect(err.message).to.eql(someError.message);
      }
    });

    it('handles not running on Azure with 404 response by throwing error', async () => {
      const failedRequest = (_req, callback) => callback(null, { statusCode: 404 });

      try {
        await AZURE._checkIfService(failedRequest);

        expect().fail('Method should throw exception (Promise.reject)');
      } catch (ignoredErr) {
        // ignored
      }
    });

    it('handles not running on Azure with unexpected response by throwing error', async () => {
      const failedRequest = (_req, callback) => callback(null, null);

      try {
        await AZURE._checkIfService(failedRequest);

        expect().fail('Method should throw exception (Promise.reject)');
      } catch (ignoredErr) {
        // ignored
      }
    });
  });

  describe('_parseBody', () => {
    // it's expected that most users use the resource manager UI (which has been out for years)
    it('parses object in expected format', () => {
      const body = {
        'compute': {
          'location': 'eastus',
          'name': 'pickypg-ubuntu-rm',
          'offer': 'UbuntuServer',
          'osType': 'Linux',
          'platformFaultDomain': '0',
          'platformUpdateDomain': '0',
          'publisher': 'Canonical',
          'sku': '16.04-LTS',
          'version': '16.04.201706191',
          'vmId': 'd4c57456-2b3b-437a-9f1f-7082cf123456',
          'vmSize': 'Standard_A1'
        },
        'network': {
          'interface': [
            {
              'ipv4': {
                'ipAddress': [
                  {
                    'privateIpAddress': '10.1.0.4',
                    'publicIpAddress': '52.170.25.71'
                  }
                ],
                'subnet': [
                  {
                    'address': '10.1.0.0',
                    'prefix': '24'
                  }
                ]
              },
              'ipv6': {
                'ipAddress': [ ]
              },
              'macAddress': '000D3A143CE3'
            }
          ]
        }
      };

      const response = AZURE._parseBody(body);

      expect(response.getName()).to.eql(AZURE.getName());
      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: 'azure',
        id: 'd4c57456-2b3b-437a-9f1f-7082cf123456',
        vm_type: 'Standard_A1',
        region: 'eastus',
        zone: undefined,
        metadata: {
          name: 'pickypg-ubuntu-rm',
          offer: 'UbuntuServer',
          osType: 'Linux',
          platformFaultDomain: '0',
          platformUpdateDomain: '0',
          publisher: 'Canonical',
          sku: '16.04-LTS',
          version: '16.04.201706191'
        }
      });
    });

    // classic represents the "old" way of launching things in Azure
    it('parses object in expected classic format', () => {
      const body = {
        'network': {
          'interface': [
            {
              'ipv4': {
                'ipAddress': [
                  {
                    'privateIpAddress': '10.1.0.4',
                    'publicIpAddress': '52.170.25.71'
                  }
                ],
                'subnet': [
                  {
                    'address': '10.1.0.0',
                    'prefix': '24'
                  }
                ]
              },
              'ipv6': {
                'ipAddress': [ ]
              },
              'macAddress': '000D3A143CE3'
            }
          ]
        }
      };

      const response = AZURE._parseBody(body);

      expect(response.getName()).to.eql(AZURE.getName());
      expect(response.isConfirmed()).to.eql(true);
      expect(response.toJSON()).to.eql({
        name: 'azure',
        id: undefined,
        vm_type: undefined,
        region: undefined,
        zone: undefined,
        metadata: {
          classic: true
        }
      });
    });

    it('ignores unexpected response body', () => {
      expect(AZURE._parseBody(undefined)).to.be(null);
      expect(AZURE._parseBody(null)).to.be(null);
      expect(AZURE._parseBody({ })).to.be(null);
      expect(AZURE._parseBody({ privateIp: 'a.b.c.d' })).to.be(null);
    });
  });
});
