/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { uiCapabilitiesRegex } from '../../../../../xpack_main/types';
const prefix = 'ui:';

export class UIActions {
  public all = `${prefix}*`;
  public allNavLinks = `${prefix}navLinks/*`;
  public allCatalogueEntries = `${prefix}catalogue/*`;
  public allManagementLinks = `${prefix}management/*`;

  public get(featureId: keyof UICapabilities, ...uiCapabilityParts: string[]) {
    if (!featureId || !isString(featureId)) {
      throw new Error('featureId is required and must be a string');
    }

    if (!uiCapabilityParts || !Array.isArray(uiCapabilityParts)) {
      throw new Error('uiCapabilityParts is required and must be an array');
    }

    if (
      uiCapabilityParts.length === 0 ||
      uiCapabilityParts.findIndex(
        part => !part || !isString(part) || !uiCapabilitiesRegex.test(part)
      ) >= 0
    ) {
      throw new Error(
        `UI capabilities are required, and must all be strings matching the pattern ${uiCapabilitiesRegex}`
      );
    }

    return `${prefix}${featureId}/${uiCapabilityParts.join('/')}`;
  }
}
