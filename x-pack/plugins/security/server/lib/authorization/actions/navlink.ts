/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';

const prefix = `navlink:`;

export class NavlinkActions {
  public all = `${prefix}*`;

  public get(navlinkId: string) {
    if (!navlinkId || !isString(navlinkId)) {
      throw new Error('navlinkId is required and must be a string');
    }

    return `${prefix}${navlinkId}`;
  }
}
