/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const useCanManipulateCustomDashboard = () => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();

  const canLinkOrEditCustomDashboard = useMemo(
    () => capabilities.savedObjectsManagement.edit === true,
    [capabilities]
  );

  const canDeleteCustomDashboard = useMemo(
    () => capabilities.savedObjectsManagement.delete === true,
    [capabilities]
  );

  return {
    canLinkOrEditCustomDashboard,
    canDeleteCustomDashboard,
  };
};
