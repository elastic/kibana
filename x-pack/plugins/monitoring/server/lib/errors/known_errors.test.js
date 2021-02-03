/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from 'elasticsearch';
import { isKnownError, handleKnownError } from './known_errors';
import { MonitoringLicenseError } from './custom_errors';

// TODO: tests were not running and are not up to date
describe.skip('Error handling for 503 errors', () => {
  it('ignores an unknown type', () => {
    const err = new errors.Generic();
    expect(isKnownError(err)).toBe(false);
  });

  it('handles ConnectionFault', () => {
    const err = new errors.ConnectionFault();
    expect(isKnownError(err)).toBe(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).toBe(
      'Connection Failure: ' +
        'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'Connection Failure: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
      },
      headers: {},
    });
  });

  it('handles NoConnections', () => {
    const err = new errors.NoConnections();
    expect(isKnownError(err)).toBe(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).toBe(
      'No Living connections: ' +
        'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'No Living connections: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
      },
      headers: {},
    });
  });

  it('handles RequestTimeout', () => {
    const err = new errors.RequestTimeout();
    expect(isKnownError(err)).toBe(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).toBe(
      'Request Timeout: ' +
        'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'Request Timeout: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.',
      },
      headers: {},
    });
  });

  it('handles the custom MonitoringLicenseError error', () => {
    const clusterName = 'main';
    const err = new MonitoringLicenseError(clusterName);
    expect(isKnownError(err)).toBe(true);

    const wrappedErr = handleKnownError(err);
    expect(wrappedErr.message).toBe(
      'Monitoring License Error: ' +
        `Could not find license information for cluster = '${clusterName}'. ` +
        `Please check the cluster's master node server logs for errors or warnings.`
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          `Monitoring License Error: Could not find license information for cluster = '${clusterName}'. ` +
          `Please check the cluster's master node server logs for errors or warnings.`,
      },
      headers: {},
    });
  });
});
