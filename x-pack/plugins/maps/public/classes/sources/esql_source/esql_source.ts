/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { SOURCE_TYPES } from '../../../../common/constants'
import type { EsqlSourceDescriptor } from '../../../../common/descriptor_types';
import { isValidStringConfig } from '../../util/valid_string_config';
import { AbstractVectorSource } from '../vector_source';
import { IVectorSource } from '../vector_source';

export const sourceTitle = i18n.translate('xpack.maps.source.esqlSearchTitle', {
  defaultMessage: 'ES|QL',
});

export class EsqlSource extends AbstractVectorSource implements IVectorSource {
  readonly _descriptor: EsqlSourceDescriptor;

  static createDescriptor(
    descriptor: Partial<EsqlSourceDescriptor>
  ): EsqlSourceDescriptor {
    if (!isValidStringConfig(descriptor.esql)) {
      throw new Error(
        'Cannot create EsqlSourceDescriptor when esql is not provided'
      );
    }
    return {
      ...descriptor,
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuidv4(),
      type: SOURCE_TYPES.ESQL,
      esql: descriptor.esql!,
    };
  }

  constructor(descriptor: EsqlSourceDescriptor) {
    super(EsqlSource.createDescriptor(descriptor));
    this._descriptor = descriptor;
  }

  getId(): string {
    return this._descriptor.id;
  }

  isESSource(): true {
    return true;
  }
}