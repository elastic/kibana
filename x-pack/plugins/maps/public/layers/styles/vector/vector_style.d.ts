/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IStyleProperty } from './properties/style_property';
import { IDynamicStyleProperty } from './properties/dynamic_style_property';
import { IVectorLayer } from '../../vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { VectorStyleDescriptor } from '../../../../common/descriptor_types';
import { AbstractStyle, IStyle } from '../abstract_style';

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): IStyleProperty[];
  getDynamicPropertiesArray(): IDynamicStyleProperty[];
}

export class VectorStyle extends AbstractStyle implements IVectorStyle {
  constructor(descriptor: VectorStyleDescriptor, source: IVectorSource, layer: IVectorLayer);

  getAllStyleProperties(): IStyleProperty[];
  getDynamicPropertiesArray(): IDynamicStyleProperty[];
}
