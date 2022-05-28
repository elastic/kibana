/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';

import { LogRetentionOptions, LogRetentionSettings, LogRetentionPolicy } from '../types';

export const renderLogRetentionDate = (dateString: string) => (
  <FormattedDate value={new Date(dateString)} month="long" day="numeric" year="numeric" />
);

const CAPITALIZATION_MAP = {
  [LogRetentionOptions.Analytics]: {
    capitalized: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.analytics.title.capitalized',
      { defaultMessage: 'Analytics' }
    ),
    lowercase: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.analytics.title.lowercase',
      { defaultMessage: 'analytics' }
    ),
  },
  [LogRetentionOptions.API]: {
    capitalized: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.api.title.capitalized',
      { defaultMessage: 'API' }
    ),
    lowercase: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.api.title.lowercase',
      { defaultMessage: 'API' }
    ),
  },
  [LogRetentionOptions.Audit]: {
    capitalized: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.audit.title.capitalized',
      { defaultMessage: 'Audit' }
    ),
    lowercase: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.audit.title.lowercase',
      { defaultMessage: 'audit' }
    ),
  },
  [LogRetentionOptions.Crawler]: {
    capitalized: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.crawler.title.capitalized',
      { defaultMessage: 'Web crawler' }
    ),
    lowercase: i18n.translate(
      'xpack.enterpriseSearch.appSearch.logRetention.type.crawler.title.lowercase',
      { defaultMessage: 'web crawler' }
    ),
  },
};

interface Props {
  type: LogRetentionOptions;
  disabledAt?: LogRetentionSettings['disabledAt'];
  minAgeDays?: LogRetentionPolicy['minAgeDays'];
}

export const NoLogging: React.FC<Props> = ({ type, disabledAt }) => {
  return (
    <>
      <FormattedMessage
        id="xpack.enterpriseSearch.appSearch.logRetention.noLogging"
        defaultMessage="{logsType} logging has been disabled for all engines."
        values={{ logsType: CAPITALIZATION_MAP[type].capitalized }}
      />{' '}
      {disabledAt ? (
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.logRetention.noLogging.collected"
          defaultMessage="The last date {logsType} logs were collected was {disabledAtDate}."
          values={{
            logsType: CAPITALIZATION_MAP[type].lowercase,
            disabledAtDate: renderLogRetentionDate(disabledAt),
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.logRetention.noLogging.notCollected"
          defaultMessage="There are no {logsType} logs collected."
          values={{ logsType: CAPITALIZATION_MAP[type].lowercase }}
        />
      )}
    </>
  );
};

export const CustomPolicy: React.FC<Props> = ({ type }) => (
  <FormattedMessage
    id="xpack.enterpriseSearch.appSearch.logRetention.customPolicy"
    defaultMessage="You have a custom {logsType} log retention policy."
    values={{ logsType: CAPITALIZATION_MAP[type].lowercase }}
  />
);

export const DefaultPolicy: React.FC<Props> = ({ type, minAgeDays }) => (
  <FormattedMessage
    id="xpack.enterpriseSearch.appSearch.logRetention.defaultPolicy"
    defaultMessage="Your {logsType} logs are being stored for at least {minAgeDays, plural, one {# day} other {# days}}."
    values={{ logsType: CAPITALIZATION_MAP[type].lowercase, minAgeDays }}
  />
);
