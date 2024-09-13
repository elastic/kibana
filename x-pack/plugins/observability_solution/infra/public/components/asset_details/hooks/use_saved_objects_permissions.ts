/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const useSavedObjectUserPermissions = () => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();

  const canSave = capabilities.savedObjectsManagement.edit === true;

  const canDelete = capabilities.savedObjectsManagement.delete === true;

  return {
    canSave,
    canDelete,
  };
};
