/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTask } from '../types';

export const additionalValidation = <T>(migrationTasks: Array<MigrationTask<T>>): void => {
  for (const migrationTask of migrationTasks) {
    if (migrationTask.deleteSavedObjects != null) {
      for (const savedObject of migrationTask.deleteSavedObjects) {
        if (savedObject.type == null) {
          throw new TypeError(
            'This type must always be defined or we will end up deleting the entire kibana saved objects index. Check to ensure you there are not circular dependencies in the code or the types changed.'
          );
        }
      }
    }
  }
};
