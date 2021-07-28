/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '../utils/utility_types';
import { mergeFields } from '../utils/fields';
import { IEventLogger, IEventLoggerTemplate } from './public_api';
import { EventLoggerParams } from './internal_api';
import { EventLogger } from './event_logger';

export class EventLoggerTemplate<TEvent> implements IEventLoggerTemplate<TEvent> {
  private readonly params: EventLoggerParams<TEvent>;

  constructor(params: EventLoggerParams<TEvent>) {
    this.params = params;
  }

  public getLoggerTemplate(fields: DeepPartial<TEvent>): IEventLoggerTemplate<TEvent> {
    const nextParams = this.getNextParams('', fields);
    return new EventLoggerTemplate<TEvent>(nextParams);
  }

  public getLogger(name: string, fields?: DeepPartial<TEvent>): IEventLogger<TEvent> {
    const nextParams = this.getNextParams(name, fields);
    const nextTemplate = new EventLoggerTemplate<TEvent>(nextParams);
    return new EventLogger<TEvent>(nextParams, nextTemplate);
  }

  private getNextParams(
    extName: string,
    extFields?: DeepPartial<TEvent>
  ): EventLoggerParams<TEvent> {
    const { indexNames, eventLoggerName, eventFields } = this.params;

    const baseName = eventLoggerName;
    const nextName = [baseName, extName].filter(Boolean).join('.');

    const baseFields = eventFields;
    const nextFields = mergeFields(baseFields, extFields, {
      // TODO: Define a schema for own fields used/set by event log. Add it to the base schema.
      // Then maybe introduce a base type for TEvent.
      'kibana.event_log.log_name': indexNames.logName,
      'kibana.event_log.logger_name': nextName,
    } as any);

    return {
      ...this.params,
      eventLoggerName: nextName,
      eventFields: nextFields,
    };
  }
}
