/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IStyleProperty } from './properties/style_property';
import { IDynamicStyleProperty } from './properties/dynamic_style_property';
import { IVectorLayer } from '../../vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { AbstractStyle, IStyle } from '../style';
import {
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../common/descriptor_types';

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): IStyleProperty[];
  getDynamicPropertiesArray(): IDynamicStyleProperty[];
  getSourceFieldNames(): string[];
}

export class VectorStyle extends AbstractStyle implements IVectorStyle {
  static createDescriptor(properties: VectorStylePropertiesDescriptor): VectorStyleDescriptor;
  static createDefaultStyleProperties(mapColors: string[]): VectorStylePropertiesDescriptor;
  constructor(descriptor: VectorStyleDescriptor, source: IVectorSource, layer: IVectorLayer);
  getSourceFieldNames(): string[];
  getAllStyleProperties(): IStyleProperty[];
  getDynamicPropertiesArray(): IDynamicStyleProperty[];
}
