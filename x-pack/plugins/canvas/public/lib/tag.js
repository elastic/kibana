/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function Tag(config) {
  // The name of the tag
  this.name = config.name;

  // color of the tag to display in a list
  this.color = config.color;
}
