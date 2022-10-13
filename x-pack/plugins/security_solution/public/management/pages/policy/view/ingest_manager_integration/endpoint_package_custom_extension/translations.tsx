/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const TRUSTED_APPS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsSummarySummary.error',
      {
        defaultMessage: 'There was an error trying to fetch trusted applications stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.trustedApps.fleetIntegration.title"
      defaultMessage="Trusted applications"
    />
  ),
};

export const EVENT_FILTERS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersSummarySummary.error',
      {
        defaultMessage: 'There was an error trying to fetch event filters stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.eventFilters.fleetIntegration.title"
      defaultMessage="Event filters"
    />
  ),
};

export const HOST_ISOLATION_EXCEPTIONS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummarySummary.error',
      {
        defaultMessage:
          'There was an error trying to fetch host isolation exceptions stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.hostIsolationExceptions.fleetIntegration.title"
      defaultMessage="Host isolation exceptions"
    />
  ),
};

export const BLOCKLISTS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsSummarySummary.error',
      {
        defaultMessage: 'There was an error trying to fetch blocklist stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.blocklists.fleetIntegration.title"
      defaultMessage="Blocklist"
    />
  ),
};
