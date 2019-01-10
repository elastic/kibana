/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import Joi from 'joi';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

import { indexNameValidator } from '../services/input_validation';

const indexNameIllegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

/* eslint-disable max-len */
export const follwerIndexFormSchema = {
  name: {
    label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameTitle', {
      defaultMessage: 'Name'
    }),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameDescription', {
      defaultMessage: 'A name for the follower index.'
    }),
    helpText: i18n.translate('xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel', {
      defaultMessage: 'Spaces and the characters {characterList} are not allowed.',
      values: { characterList: <strong>{indexNameIllegalCharacters}</strong> }
    }),
    validator: indexNameValidator,
  },
  leaderIndex: {
    label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexTitle', {
      defaultMessage: 'Leader index'
    }),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription', {
      defaultMessage: 'The leader index you want to replicate from the remote cluster.'
    }),
    helpText: i18n.translate('xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel', {
      defaultMessage: 'Spaces and the characters {characterList} are not allowed.',
      values: { characterList: <strong>{indexNameIllegalCharacters}</strong> }
    }),
    validator: indexNameValidator,
  },
  advanced: {
    maxReadRequestOperationCount: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountTitle', {
        defaultMessage: 'Max read request operation count'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations to pull per read from the remote cluster.'
      }),
      validator: Joi.number().allow(''),
    },
    maxOutstandingReadRequests: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsTitle', {
        defaultMessage: 'Max outstanding read requests'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsDescription', {
        defaultMessage: 'The maximum number of outstanding reads requests from the remote cluster.'
      }),
      validator: Joi.number().allow(''),
    },
    maxReadRequestSize: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeTitle', {
        defaultMessage: 'Max read request size'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeDescription', {
        defaultMessage: 'The maximum size in bytes of per read of a batch of operations pulled from the remote cluster (bye value).'
      }),
      validator: Joi.number().allow(''),
    },
    maxWriteRequestOperationCount: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountTitle', {
        defaultMessage: 'Max write request operation count'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations per bulk write request executed on the follower.'
      }),
      validator: Joi.number().allow(''),
    },
    maxWriteRequestSize: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeTitle', {
        defaultMessage: 'Max write request size'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeDescription', {
        defaultMessage: 'The maximum total bytes of operations per bulk write request executed on the follower.'
      }),
      validator: Joi.number().allow(''),
    },
    maxOutstandingWriteRequests: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsTitle', {
        defaultMessage: 'Max outstanding write requests'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsDescription', {
        defaultMessage: 'The maximum number of outstanding write requests on the follower.'
      }),
      validator: Joi.number().allow(''),
    },
    maxWriteBufferCount: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountTitle', {
        defaultMessage: 'Max write buffer count'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountDescription', {
        defaultMessage: 'The maximum number of operations that can be queued for writing; when this limit is reached, reads from the remote cluster will be deferred until the number of queued operations goes below the limit.'
      }),
      validator: Joi.number().allow(''),
    },
    maxWriteBufferSize: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeTitle', {
        defaultMessage: 'Max write buffer size'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeDescription', {
        defaultMessage: 'The maximum total bytes of operations that can be queued for writing; when this limit is reached, reads from the remote cluster will be deferred until the total bytes of queued operations goes below the limit.'
      }),
      validator: Joi.number().allow(''),
    },
    maxRetryDelay: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayTitle', {
        defaultMessage: 'Max retry delay'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayDescription', {
        defaultMessage: 'The maximum time to wait before retrying an operation that failed exceptionally; an exponential backoff strategy is employed when retrying.'
      }),
      validator: Joi.number().allow(''),
    },
    readPollTimeout: {
      label: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutTitle', {
        defaultMessage: 'Read poll timeout'
      }),
      description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutDescription', {
        defaultMessage: 'The maximum time to wait for new operations on the remote cluster when the follower index is synchronized with the leader index; when the timeout has elapsed, the poll for operations will return to the follower so that it can update some statistics, and then the follower will immediately attempt to read from the leader again.'
      }),
      validator: Joi.number().allow(''),
    },
  }
};
/* eslint-enable */
