/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';

const prefix = `nav_link:`;

export class NavLinkActions {
  public all = `${prefix}*`;

  public get(navLinkId: string) {
    if (!navLinkId || !isString(navLinkId)) {
      throw new Error('navLinkId is required and must be a string');
    }

    return `${prefix}${navLinkId}`;
  }
}
