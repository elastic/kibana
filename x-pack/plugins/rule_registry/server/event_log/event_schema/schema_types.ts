/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap, FieldMapType, TypeOfFieldMap } from '../../../common/field_map';

export interface EventSchema<TMap extends FieldMap> {
  objectFields: TMap;
  objectType: Event<TMap>;
  runtimeType: EventRuntimeType<TMap>;
}

export type Event<TMap extends FieldMap> = TypeOfFieldMap<TMap>;

export type EventRuntimeType<TMap extends FieldMap> = FieldMapType<TMap>;

export { FieldMap };
