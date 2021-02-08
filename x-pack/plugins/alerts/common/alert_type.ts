/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../licensing/common/types';

export interface AlertType {
  id: string;
  name: string;
  actionGroups: ActionGroup[];
  recoveryActionGroup: ActionGroup;
  actionVariables: string[];
  defaultActionGroupId: ActionGroup['id'];
  producer: string;
  minimumLicenseRequired: LicenseType;
}

export interface ActionGroup {
  id: string;
  name: string;
}
