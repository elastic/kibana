/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskLifecycleEvent } from './task_manager';
import { isTaskMarkRunningEvent, isTaskRunEvent, isTaskRunRequestEvent } from './task_events';
import { isErr } from './lib/result_type';

// some jq to view the event log
// curl -k $ES_URL/.kibana-event-log-8.0.0/_search?size=1000 |  jq '.hits.hits | .[] | ._source | select(.event.provider == "taskManager")'

const EVENT_LOG_PROVIDER = 'taskManager';
export const EVENT_LOG_ACTIONS = {
  pollError: 'poll-error',
  pluginStart: 'plugin-start',
  runNow: 'run-now',
  taskManagerEvent: 'taskmanager-event',
};

import { IEvent, IEventLogger, IEventLogService } from '../../event_log/server';
export { IEventLogger, IEventLogService } from '../../event_log/server';

export function getTaskLogger(eventLogService?: IEventLogService): TaskLogger {
  let eventLogger;
  if (!eventLogService) {
    eventLogger = getNoopEventLogger();
  } else {
    eventLogService.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    eventLogger = eventLogService.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });
  }

  return new TaskLogger(eventLogger);
}

export class TaskLogger {
  constructor(private eventLogger: IEventLogger) {}

  logPluginStart() {
    this.eventLogger.logEvent({ event: { action: EVENT_LOG_ACTIONS.pluginStart } });
  }

  logTaskManagerEvent(taskEvent: TaskLifecycleEvent) {
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.taskManagerEvent, outcome: 'success' },
      kibana: {
        saved_objects: [
          {
            type: 'task',
            id: taskEvent.id,
            rel: 'primary',
          },
        ],
      },
    };

    let message = `task manager event ${taskEvent.type}`;
    if (
      isTaskMarkRunningEvent(taskEvent) ||
      isTaskRunEvent(taskEvent) ||
      isTaskRunRequestEvent(taskEvent)
    ) {
      if (isErr(taskEvent.event)) {
        event.event!.outcome = 'failure';
        event.error = { message: taskEvent.event.error.message };
        message = `${message}: error: ${taskEvent.event.error.message}`;
      }
    }
    this.eventLogger.logEvent(event);
  }

  logPollError(error: Error) {
    this.eventLogger.logEvent({
      event: { action: EVENT_LOG_ACTIONS.pollError, outcome: 'failure' },
      message: `error polling: ${error.message}`,
      error: { message: error.message },
    });
  }

  logRunNow(taskId: string, dateStart: Date, error?: Error) {
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.runNow },
    };
    this.eventLogger.setTiming(event, dateStart);
    if (!event.event) event.event = {}; // needed for typing :-(
    if (!error) {
      event.message = `runNow complete for task ${taskId}`;
      event.event.outcome = 'success';
    } else {
      event.message = `runNow error for task ${taskId}: ${error.message}`;
      event.event.outcome = 'failure';
      event.error = { message: error.message };
    }

    this.eventLogger.logEvent(event);
  }
}

function getNoopEventLogger(): IEventLogger {
  return {
    logEvent(event: IEvent): void {},
    startTiming(event: IEvent): void {},
    stopTiming(event: IEvent): void {},
    setTiming(event: IEvent, dateStart: Date): void {},
  };
}
