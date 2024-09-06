/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSource } from '../../esql_source';
import { FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { ESESQLTermSourceDescriptor } from '../../../../../common/descriptor_types';
import { IJoinSource } from '../types';
import { IField } from '../../../fields/field';

export class ESESQLTermSource extends ESQLSource implements IJoinSource {
  static type = SOURCE_TYPES.ES_ESQL_TERM_SOURCE;

  static createDescriptor(
    descriptor: Partial<ESESQLTermSourceDescriptor>
  ): ESESQLTermSourceDescriptor {
    const normalizedDescriptor = ESQLSource.createDescriptor(descriptor);

    return {
      term: '',
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_ESQL_TERM_SOURCE,
    };
  }

  readonly _descriptor: ESESQLTermSourceDescriptor;

  constructor(descriptor: Partial<ESESQLTermSourceDescriptor>) {
    const sourceDescriptor = ESESQLTermSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  hasCompleteConfig(): boolean {
    return !!this._descriptor.term;
  }

  getOriginForField(): FIELD_ORIGIN {
    return FIELD_ORIGIN.JOIN;
  }

  getRightFields(): IField[] {
    console.log('get the fields back');
    return [];
  }
}
