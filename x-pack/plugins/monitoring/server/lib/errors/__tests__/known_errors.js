/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { errors } from 'elasticsearch';
import { isKnownError, handleKnownError } from '../known_errors';

describe('Error handling for 503 errors', () => {
  it('ignores an unknown type', () => {
    const err = new errors.Generic();
    expect(isKnownError(err)).to.be(false);
  });

  it('handles ConnectionFault', () => {
    const err = new errors.ConnectionFault();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'Connection Failure: ' +
      'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).to.be(true);
    expect(wrappedErr.isServer).to.be(true);
    expect(wrappedErr.data).to.be(null);
    expect(wrappedErr.output).to.eql({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: (
          'Connection Failure: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
        )
      },
      headers: {}
    });
  });

  it('handles NoConnections', () => {
    const err = new errors.NoConnections();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'No Living connections: ' +
      'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).to.be(true);
    expect(wrappedErr.isServer).to.be(true);
    expect(wrappedErr.data).to.be(null);
    expect(wrappedErr.output).to.eql({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: (
          'No Living connections: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
        )
      },
      headers: {}
    });
  });

  it('handles RequestTimeout', () => {
    const err = new errors.RequestTimeout();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'Request Timeout: ' +
      'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.');
    expect(wrappedErr.isBoom).to.be(true);
    expect(wrappedErr.isServer).to.be(true);
    expect(wrappedErr.data).to.be(null);
    expect(wrappedErr.output).to.eql({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Request Timeout: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.'
      },
      headers: {}
    });
  });
});
