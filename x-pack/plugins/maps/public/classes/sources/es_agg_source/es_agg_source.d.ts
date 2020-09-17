/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESSource } from '../es_source';
import { AbstractESSource } from '../es_source';
import { AGG_TYPE } from '../../../../common/constants';
import { IESAggField } from '../../fields/es_agg_field';
import { AbstractESAggSourceDescriptor } from '../../../../common/descriptor_types';

export interface IESAggSource extends IESSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldName: string): string;
  getMetricFields(): IESAggField[];
  hasMatchingMetricField(fieldName: string): boolean;
  getMetricFieldForName(fieldName: string): IESAggField | null;
}

export class AbstractESAggSource extends AbstractESSource implements IESAggSource {
  constructor(sourceDescriptor: AbstractESAggSourceDescriptor, inspectorAdapters: object);

  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldName: string): string;
  getMetricFields(): IESAggField[];
  hasMatchingMetricField(fieldName: string): boolean;
  getMetricFieldForName(fieldName: string): IESAggField | null;
}
