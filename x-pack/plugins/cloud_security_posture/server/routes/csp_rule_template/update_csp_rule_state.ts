/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspRouter } from '../../types';
import { cspRuleBulkActionRequest } from '@kbn/cloud-security-posture-plugin/common/schemas/csp_rule_template_api/bulk_action';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  UPDATE_CSP_RULE_STATE_ROUTE_PATH,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CspRuleBulkActionRequest } from '@kbn/cloud-security-posture-plugin/common/types';
import type {
  CspRulesStates,
  CspSettings,
} from '@kbn/cloud-security-posture-plugin/common/schemas/csp_settings';
import type { Logger } from '@kbn/core/server';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const updateRulesStates = async (
  soClient: SavedObjectsClientContract,
  newRulesStates: CspRulesStates
) => {
  soClient.update(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    newRulesStates
  );
};

export const setRulesStates = (
  currentRulesStates: CspRulesStates,
  ruleIds: string[],
  state: boolean
): CspRulesStates => {
  const updatedCspRulesStates: CspRulesStates = { ...currentRulesStates };
  ruleIds.forEach((ruleId) => {
    if (updatedCspRulesStates[ruleId]) {
      // Rule exists, set entry
      updatedCspRulesStates[ruleId] = { muted: state };
    } else {
      // Rule does not exist, create an entry
      updatedCspRulesStates[ruleId] = { muted: state };
    }
  });
  return updatedCspRulesStates;
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
    if (error.statusCode == 404) {
      return undefined;
    } else {
      logger.error(`An error occurred while trying to fetch csp settings: ${error}`);
    }
  }
};

export const getCspSettingObjectSafe = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CspSettings> => {
  const cspSettings = await getCspSettings(soClient, logger);

  if (!cspSettings) return (await createCspSettingObject(soClient)).attributes;

  return cspSettings;
};

export const defineUpdateCspRuleStateRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: UPDATE_CSP_RULE_STATE_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: cspRuleBulkActionRequest,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;

        try {
          const requestBody: CspRuleBulkActionRequest = request.query;

          const cspSettings = await getCspSettingObjectSafe(cspContext.soClient, cspContext.logger);

          const currentRulesStates = cspSettings.rules_states;

          const newRulesStates = setRulesStates(
            currentRulesStates,
            requestBody.rule_ids,
            muteStatesMap[requestBody.action]
          );

          await updateRulesStates(cspContext.soClient, newRulesStates);

          return response.ok({
            body: {
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
