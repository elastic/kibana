/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskLifecycleEvent } from './task_manager';
import {
  isTaskMarkRunningEvent,
  isTaskRunEvent,
  isTaskRunRequestEvent,
  TaskEventType,
} from './task_events';
import { isErr } from './lib/result_type';

// some jq to view the event log
// curl -k $ES_URL/.kibana-event-log-8.0.0/_search?size=1000 |  jq '.hits.hits | .[] | ._source | select(.event.provider == "taskManager")'

const EVENT_LOG_PROVIDER = 'taskManager';
export const EVENT_LOG_ACTIONS = {
  pollError: 'pollError',
  pluginStart: 'pluginStart',
  runNow: 'runNow',
  runTask: 'runTask',
  claimAvailableTasks: 'claimAvailableTasks',
  eventTaskClaim: 'eventTaskClaim',
  eventTaskMarkRunninig: 'eventTaskMarkRunninig',
  eventTaskRun: 'eventTaskRun',
  eventTaskRunRequest: 'eventTaskRunRequest',
  eventTaskUnknown: 'eventTaskUnknown',
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

  logRunTask(taskType: string, taskId: string, dateStart: Date, error?: Error) {
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.runTask, outcome: 'success' },
      kibana: {
        saved_objects: [
          {
            type: 'task',
            id: taskId,
            rel: 'primary',
          },
        ],
      },
    };

    if (error) {
      event.event!.outcome = 'failure';
      event.error = { message: error.message };
      event.message = `error running task ${taskType}:${taskId}: ${error.message}`;
    } else {
      event.message = `success running task ${taskType}:${taskId}`;
    }

    this.eventLogger.setTiming(event, dateStart);
    this.eventLogger.logEvent(event);
  }

  logClaimAvailableTasks(
    dateStart: Date,
    availableWorkers: number,
    claimedTasks: number,
    docsReturned: number
  ) {
    const message = [
      'claimAvailableTasks;',
      `availableWorkers: ${availableWorkers};`,
      `claimedTasks: ${claimedTasks};`,
      `docsReturned: ${docsReturned};`,
    ].join(' ');
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.claimAvailableTasks, outcome: 'success' },
      message,
    };

    this.eventLogger.setTiming(event, dateStart);
    this.eventLogger.logEvent(event);
  }

  logClaimAvailableTasksError(dateStart: Date, error: Error) {
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.claimAvailableTasks, outcome: 'failure' },
      message: `claimAvailableTasks error: ${error.message}`,
      error: { message: error.message },
    };

    this.eventLogger.setTiming(event, dateStart);
    this.eventLogger.logEvent(event);
  }

  logTaskManagerEvent(taskEvent: TaskLifecycleEvent) {
    const action = eventActionFromTaskEventType(taskEvent.type);

    const event: IEvent = {
      event: { action, outcome: 'success' },
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

    event.message = `task manager event ${taskEvent.type}`;
    if (
      isTaskMarkRunningEvent(taskEvent) ||
      isTaskRunEvent(taskEvent) ||
      isTaskRunRequestEvent(taskEvent)
    ) {
      if (isErr(taskEvent.event)) {
        event.event!.outcome = 'failure';
        event.error = { message: taskEvent.event.error.message };
        event.message = `${event.message}: error: ${taskEvent.event.error.message}`;
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

function eventActionFromTaskEventType(taskEventType: TaskEventType): string {
  const { TASK_CLAIM, TASK_MARK_RUNNING, TASK_RUN, TASK_RUN_REQUEST } = TaskEventType;
  if (taskEventType === TASK_CLAIM) return EVENT_LOG_ACTIONS.eventTaskClaim;
  if (taskEventType === TASK_MARK_RUNNING) return EVENT_LOG_ACTIONS.eventTaskMarkRunninig;
  if (taskEventType === TASK_RUN) return EVENT_LOG_ACTIONS.eventTaskRun;
  if (taskEventType === TASK_RUN_REQUEST) return EVENT_LOG_ACTIONS.eventTaskRunRequest;
  return EVENT_LOG_ACTIONS.eventTaskUnknown;
}

function getNoopEventLogger(): IEventLogger {
  return {
    logEvent(event: IEvent): void {},
    startTiming(event: IEvent): void {},
    stopTiming(event: IEvent): void {},
    setTiming(event: IEvent, dateStart: Date): void {},
  };
}
