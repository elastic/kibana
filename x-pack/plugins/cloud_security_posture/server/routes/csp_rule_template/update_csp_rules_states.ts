/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { cspRuleBulkActionRequest } from '../../../common/schemas/csp_rule_template_api/bulk_action';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  UPDATE_CSP_RULE_STATE_ROUTE_PATH,
} from '../../../common/constants';

import type { CspRuleBulkActionRequest } from '../../../common/types';
import type { CspRulesStates, CspSettings } from '../../../common/schemas/csp_settings';
import { CspRouter } from '../../types';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const updateRulesStates = async (
  soClient: SavedObjectsClientContract,
  newRulesStates: CspRulesStates
) => {
  return await soClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules_states: newRulesStates }
  );
};

export const setRulesStates = (
  rulesStates: CspRulesStates,
  ruleIds: string[],
  state: boolean
): CspRulesStates => {
  ruleIds.forEach((ruleId) => {
    if (rulesStates[ruleId]) {
      // Rule exists, set entry
      rulesStates[ruleId] = { muted: state };
    } else {
      // Rule does not exist, create an entry
      rulesStates[ruleId] = { muted: state };
    }
  });
  return rulesStates;
};

export const createCspSettingObject = async (soClient: SavedObjectsClientContract) => {
  return soClient.create<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    {
      rules_states: {},
    },
    { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
  );
};

export const createCspSettingObjectSafe = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const cspSettings = await getCspSettings(soClient, logger);

  if (!cspSettings) return (await createCspSettingObject(soClient)).attributes;
};

export const getCspSettings = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CspSettings | undefined> => {
  try {
    const cspSettings = await soClient.get<CspSettings>(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
    );
    return cspSettings.attributes;
  } catch (err) {
    const error = transformError(err);
    if (error.statusCode === 404) {
      return undefined;
    } else {
      logger.error(`An error occurred while trying to fetch csp settings: ${error}`);
    }
  }
};

export const getCspSettingsSafe = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CspSettings> => {
  const cspSettings = await getCspSettings(soClient, logger);

  if (!cspSettings) return (await createCspSettingObject(soClient)).attributes;

  return cspSettings;
};

const buildRuleKey = (benchmarkId: string, benchmarkVersion: string, ruleNumber: string) => {
  return `${benchmarkId};${benchmarkVersion};${ruleNumber}`;
};

export const defineUpdateCspRuleStateRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      path: UPDATE_CSP_RULE_STATE_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: cspRuleBulkActionRequest,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;

        try {
          const requestBody: CspRuleBulkActionRequest = request.body;

          const cspSettings = await getCspSettings(cspContext.soClient, cspContext.logger);

          if (!cspSettings) {
            throw cspContext.logger.error(`Failed to read csp settings`);
          }

          const currentRulesStates = cspSettings.rules_states;

          const ruleKeys = requestBody.rules.map((rule) =>
            buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
          );

          const newRulesStates = setRulesStates(
            currentRulesStates,
            ruleKeys,
            muteStatesMap[requestBody.action]
          );

          const newCspSettings = await updateRulesStates(cspContext.soClient, newRulesStates);

          return response.ok({
            body: {
              new_csp_settings: newCspSettings,
              message: 'The bulk operation has been executed successfully.',
            },
          });
        } catch (err) {
          const error = transformError(err);

          cspContext.logger.error(`Bulk action failed: ${error.message}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode || 500, // Default to 500 if no specific status code is provided
          });
        }
      }
    );
