/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PipelineElement } from './pipeline_element';

export class IfElement extends PipelineElement {
  constructor(statement, depth, parentId) {
    super(statement.id, statement, depth, parentId);
  }
}
