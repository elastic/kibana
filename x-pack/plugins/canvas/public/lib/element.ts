/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementSpec } from '../../types';

export class Element {
  /** The name of the Element. This must match the name of the function that is used to create the `type: render` object  */
  public name: string;
  /** A more friendly name for the Element */
  public displayName: string;
  /** The type of the Element */
  public type?: string;
  /** The name of the EUI icon to display in the element menu */
  public icon: string;
  /** A sentence or few about what this Element does */
  public help: string;
  /** A default expression that allows Canvas to render the Element */
  public expression: string;
  public filter?: string;
  /** The width of the Element.  Default is 500. */
  public width?: number;
  /** The height of the Element.  Default is 300 */
  public height?: number;

  constructor(config: ElementSpec) {
    const { name, icon, displayName, type, expression, filter, help, width, height } = config;
    this.name = name;
    this.displayName = displayName || name;
    this.icon = icon || 'empty';
    this.help = help || '';

    if (!config.expression) {
      throw new Error('Element types must have a default expression');
    }

    this.type = type;
    this.expression = expression;
    this.filter = filter;
    this.width = width || 500;
    this.height = height || 300;
  }
}
