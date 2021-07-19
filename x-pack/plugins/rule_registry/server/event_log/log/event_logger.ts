/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '../utils/utility_types';
import { mergeFields } from '../utils/fields';
import { EventLoggerParams } from './internal_api';
import { IEventLogger, IEventLoggerTemplate } from './public_api';

export class EventLogger<TEvent> implements IEventLogger<TEvent> {
  private readonly params: EventLoggerParams<TEvent>;
  private readonly ownTemplate: IEventLoggerTemplate<TEvent>;

  constructor(params: EventLoggerParams<TEvent>, template: IEventLoggerTemplate<TEvent>) {
    this.params = params;
    this.ownTemplate = template;
  }

  public getLoggerTemplate(fields: DeepPartial<TEvent>): IEventLoggerTemplate<TEvent> {
    return this.ownTemplate.getLoggerTemplate(fields);
  }

  public getLogger(name: string, fields?: DeepPartial<TEvent>): IEventLogger<TEvent> {
    return this.ownTemplate.getLogger(name, fields);
  }

  public logEvent(fields: DeepPartial<TEvent>): void {
    const { eventFields, indexWriter } = this.params;

    const event = mergeFields(eventFields, fields);
    indexWriter.indexOne(event);
  }
}
