/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionLicenses } from '../mock';
import { ActionLicenseState } from '../use_get_action_license';

export const useGetActionLicense = (): ActionLicenseState => {
  return {
    isLoading: false,
    isError: false,
    actionLicense: actionLicenses[0],
  };
};
