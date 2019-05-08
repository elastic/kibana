/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../../xpack_main/types';
import { CheckPrivilegesAtResourceResponse } from '../check_privileges';

export interface UICapabilitiesGroup {
  disable(uiCapabilities: UICapabilities): void;
  disableUsingPrivileges(
    uiCapabilities: UICapabilities,
    checkPrivilegesResponse: CheckPrivilegesAtResourceResponse
  ): void;
  disableForFeatures(uiCapabilities: UICapabilities, disabledFeatures: Feature[]): void;
  getActions(uiCapabilities: UICapabilities): string[];
}
