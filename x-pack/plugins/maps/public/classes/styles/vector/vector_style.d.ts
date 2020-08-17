/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactElement } from 'react';
import { IStyleProperty } from './properties/style_property';
import { IDynamicStyleProperty } from './properties/dynamic_style_property';
import { IVectorLayer } from '../../layers/vector_layer/vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { IStyle } from '../style';
import {
  DynamicStylePropertyOptions,
  StyleDescriptor,
  StyleMetaDescriptor,
  StylePropertyOptions,
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../common/descriptor_types';
import { StyleMeta } from './style_meta';
import { IField } from '../../fields/field';
import { DataRequest } from '../../util/data_request';
import { ILayer } from '../../layers/layer';

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  getSourceFieldNames(): string[];
  getStyleMeta(): StyleMeta;
  getDescriptorWithMissingStylePropsRemoved(
    nextFields: IField[],
    mapColors: string[]
  ): { hasChanges: boolean; nextStyleDescriptor?: VectorStyleDescriptor };
  pluckStyleMetaFromSourceDataRequest(sourceDataRequest: DataRequest): StyleMetaDescriptor;
}

export class VectorStyle implements IVectorStyle {
  static createDescriptor(properties: VectorStylePropertiesDescriptor): VectorStyleDescriptor;
  static createDefaultStyleProperties(mapColors: string[]): VectorStylePropertiesDescriptor;
  constructor(descriptor: VectorStyleDescriptor, source: IVectorSource, layer: IVectorLayer);
  getSourceFieldNames(): string[];
  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  getStyleMeta(): StyleMeta;
  getDescriptorWithMissingStylePropsRemoved(
    nextFields: IField[],
    mapColors: string[]
  ): { hasChanges: boolean; nextStyleDescriptor?: VectorStyleDescriptor };
  pluckStyleMetaFromSourceDataRequest(sourceDataRequest: DataRequest): StyleMetaDescriptor;
  renderEditor({
    layer,
    onStyleDescriptorChange,
  }: {
    layer: ILayer;
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  }): ReactElement<any> | null;
}
