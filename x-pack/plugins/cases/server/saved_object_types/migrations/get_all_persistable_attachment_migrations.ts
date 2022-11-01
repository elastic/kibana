/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { PersistableStateAttachmentState } from '../../attachment_framework/types';

const getMigrateFunction = (
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
) => {
  const migrateFn = (state: PersistableStateAttachmentState, version: string) => {
    let output = { ...state };

    if (!persistableStateAttachmentTypeRegistry.has(state.persistableStateAttachmentTypeId)) {
      return output;
    }

    const attachment = persistableStateAttachmentTypeRegistry.get(
      state.persistableStateAttachmentTypeId
    );

    const migrations = attachment.migrations;
    const attachmentMigrations = typeof migrations === 'function' ? migrations() : migrations;

    if (attachmentMigrations[version]) {
      output = attachmentMigrations[version](state);
    }

    return output;
  };

  return migrateFn;
};

export const getAllPersistableAttachmentMigrations = (
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): MigrateFunctionsObject => {
  const migrateFn = getMigrateFunction(persistableStateAttachmentTypeRegistry);
  const uniqueVersions = new Set<string>();

  for (const attachment of persistableStateAttachmentTypeRegistry.list()) {
    const migrations = attachment.migrations;
    const attachmentMigrations = typeof migrations === 'function' ? migrations() : migrations;
    Object.keys(attachmentMigrations).forEach((version) => uniqueVersions.add(version));
  }

  const migrations: MigrateFunctionsObject = {};
  uniqueVersions.forEach((version) => {
    migrations[version] = (state) => ({
      ...migrateFn(state, version),
    });
  });

  return migrations;
};
