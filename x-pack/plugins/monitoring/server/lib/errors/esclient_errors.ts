/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { boomify } from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { ErrorTypes } from '../../types';

/*
 * Check if the given error message is a known "safe" type of error
 * in which case we want to give the status as 503 and show the error message.
 *
 * This is necessary because Boom's default status code is 500, and has
 * behavior to suppress the original message to the client for security
 * reasons.
 */

const mapTypeMessage: { [key: string]: string } = {
  ConnectionError: i18n.translate('xpack.monitoring.errors.connectionErrorMessage', {
    defaultMessage:
      'Connection error: Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
  }),
  NoLivingConnectionsError: i18n.translate(
    'xpack.monitoring.errors.noLivingConnectionsErrorMessage',
    {
      defaultMessage:
        'No living connections: Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
    }
  ),
  TimeoutError: i18n.translate('xpack.monitoring.errors.TimeoutErrorMessage', {
    defaultMessage:
      'Request timeout: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.',
  }),
};

export function isESClientError(err: ErrorTypes) {
  if (err instanceof errors.ElasticsearchClientError === false) return false;
  const knownTypes = Object.keys(mapTypeMessage);
  return knownTypes.includes(err.constructor.name);
}

export function handleESClientError(err: errors.ElasticsearchClientError) {
  err.message = mapTypeMessage[err.constructor.name];
  return boomify(err, { statusCode: 503 });
}
