/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { DeprecationsDetails } from 'kibana/server';
import { checkIlmMigrationStatus } from './check_ilm_migration_status';

function deprecationError(title: string, error: Error): DeprecationsDetails[] {
  if (getErrorStatusCode(error) === 403) {
    return [
      {
        title,
        level: 'fetch_error', // NOTE: is fetch_error not shown in the Upgrade Assistant UI?
        deprecationType: 'feature',
        message: i18n.translate(
          'xpack.reporting.deprecations.reportingRole.forbiddenErrorMessage',
          { defaultMessage: 'You do not have enough permissions to fix this deprecation.' }
        ),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/current/xpack-security.html#_required_permissions_7`,
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.reporting.deprecations.reportingRole.forbiddenErrorCorrectiveAction',
              {
                defaultMessage:
                  'Make sure you have a "manage_security" cluster privilege assigned.',
              }
            ),
          ],
        },
      },
    ];
  }

  return [
    {
      title,
      level: 'fetch_error', // NOTE: is fetch_error not shown in the Upgrade Assistant UI?
      deprecationType: 'feature',
      message: i18n.translate('xpack.reporting.deprecations.reportingRole.unknownErrorMessage', {
        defaultMessage: 'Failed to perform deprecation check. Check Kibana logs for more details.',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate(
            'xpack.reporting.deprecations.reportingRole.unknownErrorCorrectiveAction',
            { defaultMessage: 'Check Kibana logs for more details.' }
          ),
        ],
      },
    },
  ];
}

function getErrorStatusCode(error: any): number | undefined {
  if (error instanceof errors.ResponseError) {
    return error.statusCode;
  }

  return Boom.isBoom(error) ? error.output.statusCode : error.statusCode || error.status;
}

function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  if (Boom.isBoom(error)) {
    return JSON.stringify(error.output.payload);
  }

  return error.message;
}

export const deprecations = {
  checkIlmMigrationStatus,
  deprecationError,
  getDetailedErrorMessage,
  getErrorStatusCode,
};
