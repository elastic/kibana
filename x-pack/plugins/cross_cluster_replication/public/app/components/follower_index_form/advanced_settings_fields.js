/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { i18n } from '@kbn/i18n';

export const advancedSettingsFields = [
  {
    field: 'maxReadRequestOperationCount',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountTitle', {
        defaultMessage: 'Max read request operation count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations to pull per read from the remote cluster.'
      }
    ),
    validator: Joi.number().empty(''),
  }, {
    field: 'maxOutstandingReadRequests',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsTitle', {
        defaultMessage: 'Max outstanding read requests'
      }
    ),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsDescription', {
      defaultMessage: 'The maximum number of outstanding read requests from the remote cluster.'
    }),
    validator: Joi.number().empty(''),
  }, {
    field: 'maxReadRequestSize',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeTitle', {
        defaultMessage: 'Max read request size'
      }
    ),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeDescription', {
      defaultMessage: 'The maximum size in bytes of per read of a batch of operations pulled from the remote cluster.'
    }),
    validator: Joi.string().empty(''),
  }, {
    field: 'maxWriteRequestOperationCount',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountTitle', {
        defaultMessage: 'Max write request operation count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations per bulk write request executed on the follower.'
      }
    ),
    validator: Joi.number().empty(''),
  }, {
    field: 'maxWriteRequestSize',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeTitle', {
        defaultMessage: 'Max write request size'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeDescription', {
        defaultMessage: 'The maximum total bytes of operations per bulk write request executed on the follower.'
      }
    ),
    validator: Joi.string().empty(''),
  }, {
    field: 'maxOutstandingWriteRequests',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsTitle', {
        defaultMessage: 'Max outstanding write requests'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsDescription', {
        defaultMessage: 'The maximum number of outstanding write requests on the follower.'
      }
    ),
    validator: Joi.number().empty(''),
  }, {
    field: 'maxWriteBufferCount',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountTitle', {
        defaultMessage: 'Max write buffer count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountDescription', {
        defaultMessage: `The maximum number of operations that can be queued for writing; when this
          limit is reached, reads from the remote cluster will be deferred until the number of queued
          operations goes below the limit.`
      }
    ),
    validator: Joi.number().empty(''),
  }, {
    field: 'maxWriteBufferSize',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeTitle', {
        defaultMessage: 'Max write buffer size'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeDescription', {
        defaultMessage: `The maximum total bytes of operations that can be queued for writing; when
          this limit is reached, reads from the remote cluster will be deferred until the total bytes
          of queued operations goes below the limit.`
      }
    ),
    validator: Joi.string().empty(''),
  }, {
    field: 'maxRetryDelay',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayTitle', {
        defaultMessage: 'Max retry delay'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayDescription', {
        defaultMessage: `The maximum time to wait before retrying an operation that failed exceptionally;
        an exponential backoff strategy is employed when retrying.`
      }
    ),
    validator: Joi.string().empty(''),
  }, {
    field: 'readPollTimeout',
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutTitle', {
        defaultMessage: 'Read poll timeout'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutDescription', {
        defaultMessage: `The maximum time to wait for new operations on the remote cluster when the
          follower index is synchronized with the leader index; when the timeout has elapsed, the
          poll for operations will return to the follower so that it can update some statistics, and
          then the follower will immediately attempt to read from the leader again.`
      }
    ),
    validator: Joi.string().empty(''),
  },
];
