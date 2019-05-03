/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class AbstractStyle {

  getDescriptorWithMissingStylePropsRemoved(/* nextOrdinalFields */) {
    return {
      hasChanges: false,
    };
  }

  pluckStyleMetaFromSourceDataRequest(/* sourceDataRequest */) {
    return {};
  }

  getDescriptor() {
    return this._descriptor;
  }

  renderEditor(/* { layer, onStyleDescriptorChange } */) {
    return null;
  }
}
