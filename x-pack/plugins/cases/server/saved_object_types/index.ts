/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { createCaseSavedObjectType } from './cases/cases';
import { caseConfigureSavedObjectType } from './configure';
import { createCaseCommentSavedObjectType } from './comments';
import { createCaseUserActionSavedObjectType } from './user_actions';
import { caseConnectorMappingsSavedObjectType } from './connector_mappings';
import { casesTelemetrySavedObjectType } from './telemetry';
import { casesRulesSavedObjectType } from './cases_oracle';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';

interface RegisterSavedObjectsArgs {
  core: CoreSetup;
  logger: Logger;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

export const registerSavedObjects = ({
  core,
  logger,
  persistableStateAttachmentTypeRegistry,
  lensEmbeddableFactory,
}: RegisterSavedObjectsArgs) => {
  core.savedObjects.registerType(
    createCaseCommentSavedObjectType({
      migrationDeps: {
        persistableStateAttachmentTypeRegistry,
        lensEmbeddableFactory,
      },
    })
  );

  core.savedObjects.registerType(caseConfigureSavedObjectType);
  core.savedObjects.registerType(caseConnectorMappingsSavedObjectType);
  core.savedObjects.registerType(createCaseSavedObjectType(core, logger));
  core.savedObjects.registerType(
    createCaseUserActionSavedObjectType({
      persistableStateAttachmentTypeRegistry,
    })
  );

  core.savedObjects.registerType(casesTelemetrySavedObjectType);
  core.savedObjects.registerType(casesRulesSavedObjectType);
};
