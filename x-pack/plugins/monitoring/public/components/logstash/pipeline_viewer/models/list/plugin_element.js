/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Element } from './element';

export class PluginElement extends Element {
  constructor(statement, depth, parentId) {
    const { id } = statement;
    super(id, statement, depth, parentId);
  }
}
