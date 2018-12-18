/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import defaultHeader from './default_header.png';

export function Element(config) {
  // This must match the name of the function that is used to create the `type: render` object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || this.name;

  // An image to use in the element type selector
  this.image = config.image || defaultHeader;

  // A sentence or few about what this element does
  this.help = config.help;

  if (!config.expression) {
    throw new Error('Element types must have a default expression');
  }
  this.expression = config.expression;
  this.filter = config.filter;
  this.width = config.width || 500;
  this.height = config.height || 300;
}
