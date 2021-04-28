/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const generateEmptyDataMessage = (agentsResponded: number): string => {
  switch (agentsResponded) {
    case 0:
      return i18n.translate('xpack.osquery.results.noAgentsResponded', {
        defaultMessage: 'No agents have responded.',
      });
    case 1:
      return i18n.translate('xpack.osquery.results.oneAgentResponded', {
        defaultMessage:
          '{agentsResponded} agent has responded, but no osquery data has been reported.',
        values: { agentsResponded },
      });
    default:
      return i18n.translate('xpack.osquery.results.multipleAgentsResponded', {
        defaultMessage:
          '{agentsResponded} agents have responded, but no osquery data has been reported.',
        values: { agentsResponded },
      });
  }
};

export const ERROR_ALL_RESULTS = i18n.translate('xpack.osquery.results.errorSearchDescription', {
  defaultMessage: `An error has occurred on all results search`,
});

export const FAIL_ALL_RESULTS = i18n.translate('xpack.osquery.results.failSearchDescription', {
  defaultMessage: `Failed to fetch results`,
});
