/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';
const prefix = 'ui:';

export class UIActions {
  public all = `${prefix}*`;
  public allNavLinks = `${prefix}navLinks/*`;

  public get(featureId: string, uiCapability: string) {
    if (!featureId || !isString(featureId)) {
      throw new Error('featureId is required and must be a string');
    }

    if (!uiCapability || !isString(uiCapability)) {
      throw new Error('uiCapability is required and must be a string');
    }

    return `${prefix}${featureId}/${uiCapability}`;
  }
}
