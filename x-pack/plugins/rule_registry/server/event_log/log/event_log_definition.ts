/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicy, defaultIlmPolicy, IndexNames } from '../elasticsearch';
import { EventSchema, FieldMap, Schema } from '../event_schema';
import { EventLogOptions, IEventLogDefinition } from './public_api';

export class EventLogDefinition<TMap extends FieldMap> implements IEventLogDefinition<TMap> {
  public readonly eventLogName: string;
  public readonly eventSchema: EventSchema<TMap>;
  public readonly ilmPolicy: IlmPolicy;

  constructor(options: EventLogOptions<TMap>) {
    // TODO: validate options; options.name should not contain "-" and "."
    this.eventLogName = options.name;
    this.eventSchema = options.schema;
    this.ilmPolicy = options.ilmPolicy ?? defaultIlmPolicy;
  }

  public defineChild<TExtMap extends FieldMap = TMap>(
    options: EventLogOptions<TExtMap>
  ): IEventLogDefinition<TMap & TExtMap> {
    const childName = IndexNames.createChildLogName(this.eventLogName, options.name);
    const childSchema = Schema.combine(this.eventSchema, options.schema);
    const childPolicy = options.ilmPolicy ?? this.ilmPolicy;

    return new EventLogDefinition({
      name: childName,
      schema: childSchema,
      ilmPolicy: childPolicy,
    });
  }
}
