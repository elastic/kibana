/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import pick from 'lodash/pick';
import { FieldAttribute, FieldMetadataPlain, PartialFieldMetadataPlain } from '../types';

// Use class/interface merging to define instance properties from FieldMetadataPlain.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldMetadata extends FieldMetadataPlain {}
export class FieldMetadata {
  private constructor(fieldMetadata: FieldMetadataPlain) {
    Object.assign(this, fieldMetadata);
  }

  public pick(props: FieldAttribute[]): PartialFieldMetadataPlain {
    return pick(this, props);
  }

  public toPlain(): FieldMetadataPlain {
    return Object.assign({}, this);
  }

  public static create(fieldMetadata: FieldMetadataPlain) {
    const flat_name = fieldMetadata.flat_name ?? fieldMetadata.name;
    const dashed_name = fieldMetadata.dashed_name ?? FieldMetadata.toDashedName(flat_name);
    const normalize = fieldMetadata.normalize ?? [];
    const short = fieldMetadata.short ?? fieldMetadata.description;
    const source = fieldMetadata.source ?? 'unknown';
    const type = fieldMetadata.type ?? 'unknown';

    const fieldMetadataProps = {
      ...fieldMetadata,
      dashed_name,
      flat_name,
      normalize,
      short,
      source,
      type,
    };

    return new FieldMetadata(fieldMetadataProps);
  }

  private static toDashedName(flatName: string) {
    return flatName.split('.').join('-');
  }
}
