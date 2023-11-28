/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

/**
 * Returns true if the user has read privileges for cases, false otherwise
 */
export const useShowRelatedCases = (): boolean => {
  const { cases } = useKibana().services;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  return userCasesPermissions.read;
};
