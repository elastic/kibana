/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventSchema, Event } from './schema_types';
import { FieldMap, runtimeTypeFromFieldMap, mergeFieldMaps } from '../../../common/field_map';
import {
  TechnicalRuleFieldMap,
  technicalRuleFieldMap,
} from '../../../common/assets/field_maps/technical_rule_field_map';

const baseSchema = createSchema(technicalRuleFieldMap);

export abstract class Schema {
  public static create<TMap extends FieldMap>(fields: TMap): EventSchema<TMap> {
    return createSchema(fields);
  }

  public static combine<T1 extends FieldMap, T2 extends FieldMap>(
    s1: EventSchema<T1>,
    s2: EventSchema<T2>
  ): EventSchema<T1 & T2> {
    const combinedFields = mergeFieldMaps(s1.objectFields, s2.objectFields);
    return createSchema(combinedFields);
  }

  public static getBase(): EventSchema<TechnicalRuleFieldMap> {
    return baseSchema;
  }

  public static extendBase<TMap extends FieldMap>(
    fields: TMap
  ): EventSchema<TechnicalRuleFieldMap & TMap> {
    const extensionSchema = createSchema(fields);
    return this.combine(baseSchema, extensionSchema);
  }
}

function createSchema<TMap extends FieldMap>(fields: TMap): EventSchema<TMap> {
  const objectType: Event<TMap> = ({} as unknown) as Event<TMap>;
  const runtimeType = runtimeTypeFromFieldMap(fields);

  return {
    objectFields: fields,
    objectType,
    runtimeType,
  };
}
