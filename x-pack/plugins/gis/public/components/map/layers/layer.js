/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let idCounter = 0;


export class ALayer {
  constructor() {
    this._id = (idCounter++).toString();
    this._visibility = true;

    this._onVisibilityChange = (visibility) => {
      this.setVisibility(visibility);
    };
  }

  setVisibility(newVisibility) {
    if (newVisibility !== this._visibility) {
      this._visibility = newVisibility;
      this.emit('visibilityChanged', this);
    }
  }

  getLayerName() {
    throw new Error('Should implement Layer#getLayerName');
  }

  getType() {
    throw new Error('should implement getType');
  }
}

