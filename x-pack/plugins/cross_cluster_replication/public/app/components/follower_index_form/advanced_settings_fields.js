/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { byteUnitsUrl, timeUnitsUrl } from '../../services/documentation_links';
import { getSettingDefault } from '../../services/follower_index_default_settings';

const byteUnitsHelpText = (
  <FormattedMessage
    id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.byteUnitsHelpText"
    defaultMessage="Example values: 10b, 1024kb, 1mb, 5gb, 2tb, 1pb. {link}"
    values={{ link: (
      <a href={byteUnitsUrl} target="_blank">
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.byteUnitsHelpTextLinkMessage"
          defaultMessage="Learn more"
        />
      </a>
    ) }}
  />
);

const timeUnitsHelpText = (
  <FormattedMessage
    id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.timeUnitsHelpText"
    defaultMessage="Example values: 2d, 24h, 20m, 30s, 500ms, 10000micros, 80000nanos. {link}"
    values={{ link: (
      <a href={timeUnitsUrl} target="_blank">
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndexForm.advancedSettings.timeUnitsHelpTextLinkMessage"
          defaultMessage="Learn more"
        />
      </a>
    ) }}
  />
);

export const advancedSettingsFields = [
  {
    field: 'maxReadRequestOperationCount',
    testSubject: 'maxReadRequestOperationCountInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountTitle', {
        defaultMessage: 'Max read request operation count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations to pull per read from the remote cluster.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestOperationCountLabel', {
        defaultMessage: 'Max read request operation count'
      }
    ),
    defaultValue: getSettingDefault('maxReadRequestOperationCount'),
    type: 'number',
  }, {
    field: 'maxOutstandingReadRequests',
    testSubject: 'maxOutstandingReadRequestsInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsTitle', {
        defaultMessage: 'Max outstanding read requests'
      }
    ),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsDescription', {
      defaultMessage: 'The maximum number of outstanding read requests from the remote cluster.'
    }),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingReadRequestsLabel', {
        defaultMessage: 'Max outstanding read requests'
      }
    ),
    defaultValue: getSettingDefault('maxOutstandingReadRequests'),
    type: 'number',
  }, {
    field: 'maxReadRequestSize',
    testSubject: 'maxReadRequestSizeInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeTitle', {
        defaultMessage: 'Max read request size'
      }
    ),
    description: i18n.translate('xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeDescription', {
      defaultMessage: 'The maximum size in bytes of per read of a batch of operations pulled from the remote cluster.'
    }),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxReadRequestSizeLabel', {
        defaultMessage: 'Max read request size'
      }
    ),
    defaultValue: getSettingDefault('maxReadRequestSize'),
    helpText: byteUnitsHelpText,
  }, {
    field: 'maxWriteRequestOperationCount',
    testSubject: 'maxWriteRequestOperationCountInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountTitle', {
        defaultMessage: 'Max write request operation count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountDescription', {
        defaultMessage: 'The maximum number of operations per bulk write request executed on the follower.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestOperationCountLabel', {
        defaultMessage: 'Max write request operation count'
      }
    ),
    defaultValue: getSettingDefault('maxWriteRequestOperationCount'),
    type: 'number',
  }, {
    field: 'maxWriteRequestSize',
    testSubject: 'maxWriteRequestSizeInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeTitle', {
        defaultMessage: 'Max write request size'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeDescription', {
        defaultMessage: 'The maximum total bytes of operations per bulk write request executed on the follower.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteRequestSizeLabel', {
        defaultMessage: 'Max write request size'
      }
    ),
    defaultValue: getSettingDefault('maxWriteRequestSize'),
    helpText: byteUnitsHelpText,
  }, {
    field: 'maxOutstandingWriteRequests',
    testSubject: 'maxOutstandingWriteRequestsInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsTitle', {
        defaultMessage: 'Max outstanding write requests'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsDescription', {
        defaultMessage: 'The maximum number of outstanding write requests on the follower.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxOutstandingWriteRequestsLabel', {
        defaultMessage: 'Max outstanding write requests'
      }
    ),
    defaultValue: getSettingDefault('maxOutstandingWriteRequests'),
    type: 'number',
  }, {
    field: 'maxWriteBufferCount',
    testSubject: 'maxWriteBufferCountInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountTitle', {
        defaultMessage: 'Max write buffer count'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountDescription', {
        defaultMessage: 'The maximum number of operations that can be queued for writing; when this ' +
          'limit is reached, reads from the remote cluster will be deferred until the number of queued ' +
          'operations goes below the limit.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferCountLabel', {
        defaultMessage: 'Max write buffer count'
      }
    ),
    defaultValue: getSettingDefault('maxWriteBufferCount'),
    type: 'number',
  }, {
    field: 'maxWriteBufferSize',
    testSubject: 'maxWriteBufferSizeInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeTitle', {
        defaultMessage: 'Max write buffer size'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeDescription', {
        defaultMessage: 'The maximum total bytes of operations that can be queued for writing; when ' +
          'this limit is reached, reads from the remote cluster will be deferred until the total bytes ' +
          'of queued operations goes below the limit.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxWriteBufferSizeLabel', {
        defaultMessage: 'Max write buffer size'
      }
    ),
    defaultValue: getSettingDefault('maxWriteBufferSize'),
    helpText: byteUnitsHelpText,
  }, {
    field: 'maxRetryDelay',
    testSubject: 'maxRetryDelayInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayTitle', {
        defaultMessage: 'Max retry delay'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayDescription', {
        defaultMessage: 'The maximum time to wait before retrying an operation that failed exceptionally; ' +
        'an exponential backoff strategy is employed when retrying.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.maxRetryDelayLabel', {
        defaultMessage: 'Max retry delay'
      }
    ),
    defaultValue: getSettingDefault('maxRetryDelay'),
    helpText: timeUnitsHelpText,
  }, {
    field: 'readPollTimeout',
    testSubject: 'readPollTimeoutInput',
    title: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutTitle', {
        defaultMessage: 'Read poll timeout'
      }
    ),
    description: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutDescription', {
        defaultMessage: 'The maximum time to wait for new operations on the remote cluster when the ' +
          'follower index is synchronized with the leader index; when the timeout has elapsed, the ' +
          'poll for operations will return to the follower so that it can update some statistics, and ' +
          'then the follower will immediately attempt to read from the leader again.'
      }
    ),
    label: i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.advancedSettings.readPollTimeoutLabel', {
        defaultMessage: 'Read poll timeout'
      }
    ),
    defaultValue: getSettingDefault('readPollTimeout'),
    helpText: timeUnitsHelpText,
  },
];

export const emptyAdvancedSettings = advancedSettingsFields.reduce((obj, advancedSetting) => {
  const { field, defaultValue } = advancedSetting;
  return { ...obj, [field]: defaultValue };
}, {});

export function areAdvancedSettingsEdited(followerIndex) {
  return advancedSettingsFields.some(advancedSetting => {
    const { field } = advancedSetting;
    return followerIndex[field] !== emptyAdvancedSettings[field];
  });
}
