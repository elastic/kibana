/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesPermissions } from '@kbn/cases-plugin/common';
import { EMPTY_VALUE } from '../../../common/constants';
import { useKibana } from '../../../hooks';

/**
 * Decides if we enable or disable the add to existing and add to new case features.
 * If the Indicator has no name the features will be disabled.
 * If the user doesn't have the correct permissions the features will be disabled.
 *
 * @param indicatorName the name of the indicator
 * @return true if the features are enabled
 */
export const useCaseDisabled = (indicatorName: string): boolean => {
  const { cases } = useKibana().services;
  const permissions: CasesPermissions = cases.helpers.canUseCases();

  // disable the item if there is no indicator name or if the user doesn't have the right permission
  // in the case's attachment, the indicator name is the link to open the flyout
  const invalidIndicatorName: boolean = indicatorName === EMPTY_VALUE;
  const hasPermission: boolean = permissions.create && permissions.update;

  return invalidIndicatorName || !hasPermission;
};
