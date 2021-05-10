/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '../utils/utility_types';
import { IEventLog, IEventLogger, IEventLoggerTemplate, IEventQueryBuilder } from './public_api';
import { EventLogParams } from './internal_api';
import { EventLoggerTemplate } from './event_logger_template';
import { EventQueryBuilder } from './event_query_builder';

export class EventLog<TEvent> implements IEventLog<TEvent> {
  private readonly params: EventLogParams;
  private readonly initialTemplate: IEventLoggerTemplate<TEvent>;

  constructor(params: EventLogParams) {
    this.params = params;
    this.initialTemplate = new EventLoggerTemplate<TEvent>({
      ...params,
      eventLoggerName: '',
      eventFields: {},
    });
  }

  public getLoggerTemplate(fields: DeepPartial<TEvent>): IEventLoggerTemplate<TEvent> {
    return this.initialTemplate.getLoggerTemplate(fields);
  }

  public getLogger(loggerName: string, fields?: DeepPartial<TEvent>): IEventLogger<TEvent> {
    return this.initialTemplate.getLogger(loggerName, fields);
  }

  public getEvents(): IEventQueryBuilder<TEvent> {
    return new EventQueryBuilder<TEvent>(this.params);
  }
}
