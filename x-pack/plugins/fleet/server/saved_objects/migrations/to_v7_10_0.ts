/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';
import {
  Agent,
  AgentEvent,
  AgentPolicy,
  PackagePolicy,
  EnrollmentAPIKey,
  Settings,
  AgentAction,
  Installation,
} from '../../types';

export const migrateAgentToV7100: SavedObjectMigrationFn<
  Exclude<Agent, 'policy_id' | 'policy_revision'> & {
    config_id?: string;
    config_revision?: number | null;
  },
  Agent
> = (agentDoc) => {
  agentDoc.attributes.policy_id = agentDoc.attributes.config_id;
  delete agentDoc.attributes.config_id;

  agentDoc.attributes.policy_revision = agentDoc.attributes.config_revision;
  delete agentDoc.attributes.config_revision;

  return agentDoc;
};

export const migrateAgentEventToV7100: SavedObjectMigrationFn<
  Exclude<AgentEvent, 'policy_id'> & {
    config_id?: string;
  },
  AgentEvent
> = (agentEventDoc) => {
  agentEventDoc.attributes.policy_id = agentEventDoc.attributes.config_id;
  delete agentEventDoc.attributes.config_id;

  return agentEventDoc;
};

export const migrateAgentPolicyToV7100: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'package_policies'> & {
    package_configs: string[] | PackagePolicy[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.package_policies = agentPolicyDoc.attributes.package_configs;
  // @ts-expect-error
  delete agentPolicyDoc.attributes.package_configs;

  return agentPolicyDoc;
};

export const migrateEnrollmentApiKeysToV7100: SavedObjectMigrationFn<
  Exclude<EnrollmentAPIKey, 'policy_id'> & {
    config_id?: string;
  },
  EnrollmentAPIKey
> = (enrollmentApiKeyDoc) => {
  enrollmentApiKeyDoc.attributes.policy_id = enrollmentApiKeyDoc.attributes.config_id;
  delete enrollmentApiKeyDoc.attributes.config_id;

  return enrollmentApiKeyDoc;
};

export const migratePackagePolicyToV7100: SavedObjectMigrationFn<
  Exclude<PackagePolicy, 'policy_id'> & {
    config_id: string;
  },
  PackagePolicy
> = (packagePolicyDoc) => {
  packagePolicyDoc.attributes.policy_id = packagePolicyDoc.attributes.config_id;
  // @ts-expect-error
  delete packagePolicyDoc.attributes.config_id;

  return packagePolicyDoc;
};

export const migrateSettingsToV7100: SavedObjectMigrationFn<
  Exclude<Settings, 'kibana_urls'> & {
    kibana_url: string;
  },
  Settings
> = (settingsDoc) => {
  settingsDoc.attributes.kibana_urls = [settingsDoc.attributes.kibana_url];
  // @ts-expect-error
  delete settingsDoc.attributes.kibana_url;

  return settingsDoc;
};

export const migrateAgentActionToV7100 = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationFn<AgentAction, AgentAction> => {
  return encryptedSavedObjects.createMigration(
    (agentActionDoc): agentActionDoc is SavedObjectUnsanitizedDoc<AgentAction> => {
      // @ts-expect-error
      return agentActionDoc.attributes.type === 'CONFIG_CHANGE';
    },
    (agentActionDoc) => {
      let agentActionData;
      try {
        agentActionData = agentActionDoc.attributes.data
          ? JSON.parse(agentActionDoc.attributes.data)
          : undefined;
      } catch (e) {
        // Silently swallow JSON parsing error
      }
      if (agentActionData && agentActionData.config) {
        const {
          attributes: { data, ...restOfAttributes },
        } = agentActionDoc;
        const { config, ...restOfData } = agentActionData;
        return {
          ...agentActionDoc,
          attributes: {
            ...restOfAttributes,
            type: 'POLICY_CHANGE',
            data: JSON.stringify({
              ...restOfData,
              policy: config,
            }),
          },
        };
      } else {
        return agentActionDoc;
      }
    }
  );
};

export const migrateInstallationToV7100: SavedObjectMigrationFn<
  Exclude<Installation, 'install_source'>,
  Installation
> = (installationDoc) => {
  installationDoc.attributes.install_source = 'registry';

  return installationDoc;
};
