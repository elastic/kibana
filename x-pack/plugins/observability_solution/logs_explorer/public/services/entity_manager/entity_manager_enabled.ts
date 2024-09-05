/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityManagerPublicPluginStart } from '@kbn/entityManager-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE } from '@kbn/management-settings-ids';

/**
 * Checks if both "observability:entityCentricExperience" setting and EEM are enabled
 * @returns boolean
 */
export async function entityManagerEnabled({
  core,
  entityManager,
}: {
  entityManager: EntityManagerPublicPluginStart;
  core: CoreStart;
}) {
  try {
    const isEntityCentricExperienceSettingEnabled = core.uiSettings.get(
      OBSERVABILITY_ENTITY_CENTRIC_EXPERIENCE
    );
    const { enabled: isManagedEntityDiscoveryEnabled } =
      await entityManager.entityClient.isManagedEntityDiscoveryEnabled();

    return isEntityCentricExperienceSettingEnabled && isManagedEntityDiscoveryEnabled;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return false;
  }
}
