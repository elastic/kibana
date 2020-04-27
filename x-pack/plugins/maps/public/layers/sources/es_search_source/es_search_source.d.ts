/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESSource } from '../es_source';
import { ESSearchSourceDescriptor } from '../../../../common/descriptor_types';

export class ESSearchSource extends AbstractESSource {
  static createDescriptor(sourceConfig: unknown): ESSearchSourceDescriptor;

  constructor(sourceDescriptor: Partial<ESSearchSourceDescriptor>, inspectorAdapters: unknown);
  getFieldNames(): string[];
}
