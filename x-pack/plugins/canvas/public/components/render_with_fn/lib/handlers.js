/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ElementHandlers {
  resize() {}

  destroy() {}

  onResize(fn) {
    this.resize = fn;
  }

  onDestroy(fn) {
    this.destroy = fn;
  }
}
