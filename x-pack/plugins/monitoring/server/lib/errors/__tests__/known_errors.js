/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { errors } from '@elastic/elasticsearch';
import { isKnownError, handleKnownError } from '../known_errors';

describe('Error handling for 503 errors', () => {
  it('ignores an unknown type', () => {
    const err = new Error();
    expect(isKnownError(err)).to.be(false);
  });

  it('handles ConnectionError', () => {
    const err = new errors.ConnectionError();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'Connection Error: ' +
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
          'Connection Error: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
        )
      },
      headers: {}
    });
  });

  it('handles NoLivingConnectionsError', () => {
    const err = new errors.NoLivingConnectionsError();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'No Living Connections Error: ' +
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
          'No Living Connections Error: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
        )
      },
      headers: {}
    });
  });

  it('handles TimeoutError', () => {
    const err = new errors.TimeoutError();
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'Timeout Error: ' +
      'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.');
    expect(wrappedErr.isBoom).to.be(true);
    expect(wrappedErr.isServer).to.be(true);
    expect(wrappedErr.data).to.be(null);
    expect(wrappedErr.output).to.eql({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Timeout Error: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.'
      },
      headers: {}
    });
  });

  it('handles ResponseError', () => {
    const err = new errors.ResponseError({ statusCode: 408 }); // timeout, lol!
    expect(isKnownError(err)).to.be(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).to.be(
      'Response Error: ' +
      'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.');
    expect(wrappedErr.isBoom).to.be(true);
    expect(wrappedErr.isServer).to.be(true);
    expect(wrappedErr.data).to.be(null);
    expect(wrappedErr.output).to.eql({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Response Error: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.'
      },
      headers: {}
    });
  });
});
