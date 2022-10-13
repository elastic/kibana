/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasMlAdminPermissions } from '../../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../../../../../common/components/ml/hooks/use_ml_capabilities';

export const useHasMlPermissions = () => {
  const mlCapabilities = useMlCapabilities();

  // TODO: Refactor license check + hasMlAdminPermissions to common check
  return hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);
};
