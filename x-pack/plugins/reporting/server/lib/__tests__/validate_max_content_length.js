/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import sinon from 'sinon';
import { validateMaxContentLength } from '../validate_max_content_length';

const FIVE_HUNDRED_MEGABYTES = 524288000;
const ONE_HUNDRED_MEGABYTES = 104857600;

describe('Reporting: Validate Max Content Length', () => {
  const log = sinon.spy();

  beforeEach(() => {
    log.resetHistory();
  });

  it('should log warning messages when reporting has a higher max-size than elasticsearch', async () => {
    const server = {
      config: () => ({
        get: sinon.stub().returns(FIVE_HUNDRED_MEGABYTES),
      }),
      plugins: {
        elasticsearch: {
          getCluster: () => ({
            callWithInternalUser: () => ({
              defaults: {
                http: {
                  max_content_length: '100mb',
                },
              },
            }),
          }),
        },
      },
    };

    await validateMaxContentLength(server, log);

    sinon.assert.calledWithMatch(log, `xpack.reporting.csv.maxSizeBytes (524288000) is higher`);
    sinon.assert.calledWithMatch(log, `than ElasticSearch's http.max_content_length (104857600)`);
    sinon.assert.calledWithMatch(log, 'Please set http.max_content_length in ElasticSearch to match');
    sinon.assert.calledWithMatch(log, 'or lower your xpack.reporting.csv.maxSizeBytes in Kibana');
  });

  it('should do nothing when reporting has the same max-size as elasticsearch', async () => {
    const server = {
      config: () => ({
        get: sinon.stub().returns(ONE_HUNDRED_MEGABYTES),
      }),
      plugins: {
        elasticsearch: {
          getCluster: () => ({
            callWithInternalUser: () => ({
              defaults: {
                http: {
                  max_content_length: '100mb',
                },
              },
            }),
          }),
        },
      },
    };

    expect(async () => validateMaxContentLength(server, log)).not.to.throwError();
    sinon.assert.notCalled(log);
  });
});
