/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactElement } from 'react';
import { StyleDescriptor } from '../../../common/descriptor_types';
import { ILayer } from '../layer';

// todo: not sure if this is the right one
export interface IStyle {
  getDescriptor(): StyleDescriptor;
  getDescriptorWithMissingStylePropsRemoved(): unknown;
  pluckStyleMetaFromSourceDataRequest(): unknown;
  renderEditor({
    layer,
    onStyleDescriptorChange,
  }: {
    layer: ILayer;
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  }): ReactElement<any> | null;
  getSourceFieldNames(): string[];
}

export class AbstractStyle implements IStyle {
  readonly _descriptor: StyleDescriptor;

  constructor(descriptor: StyleDescriptor) {
    this._descriptor = descriptor;
  }

  getDescriptorWithMissingStylePropsRemoved(/* nextOrdinalFields */) {
    return {
      hasChanges: false,
    };
  }

  async pluckStyleMetaFromSourceDataRequest(/* sourceDataRequest */) {
    return {};
  }

  getDescriptor(): StyleDescriptor {
    return this._descriptor;
  }

  renderEditor(/* { layer, onStyleDescriptorChange } */) {
    return null;
  }

  getSourceFieldNames(): string[] {
    return [];
  }
}
