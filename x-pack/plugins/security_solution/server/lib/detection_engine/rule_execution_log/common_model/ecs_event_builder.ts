/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventObjectKey, IEcsEvent } from './ecs_event';
import { RuleExecutionEventLevel, getLevelSeverity } from './rule_execution_event_levels';
import { RuleExecutionStatus, getStatusSeverity } from './rule_execution_statuses';

const EVENT_LOG_PROVIDER = 'detection-engine'; // TODO: "siem", "siem-detection-engine", "security-solution", other?
const EVENT_LOG_NAME = 'rule-execution-log'; // TODO: A more generic rule-log? A separate rule-management (rule-audit) log?

export class EcsEventBuilder {
  private _result: IEcsEvent = {};

  constructor() {
    // TODO: Which version does event_log use? Should it be specified here or inside the event log itself?
    this.ecs('1.9.0');
    this.logger(EVENT_LOG_PROVIDER, EVENT_LOG_NAME);
  }

  /**
   * Sets "@timestamp", message.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-base.html
   * @param eventDate When the event happened (not captured or created). Example: new Date().
   * @param eventMessage Example: "Machine learning job is not started".
   */
  public baseFields(eventDate: Date, eventMessage: string): EcsEventBuilder {
    return this.base({
      '@timestamp': eventDate.toISOString(),
      message: eventMessage,
    });
  }

  /**
   * Sets event.provider, event.dataset, log.logger.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-log.html
   * @param logProvider 1st-level category (plugin, subsystem). Example: "detection-engine".
   * @param logName 2nd-level category (feature, module). Example: "rule-execution-log".
   */
  public logger(logProvider: string, logName: string): EcsEventBuilder {
    return this.nested('event', {
      provider: logProvider,
      dataset: `${logProvider}.${logName}`,
    }).nested('log', {
      logger: `${logProvider}.${logName}`,
    });
  }

  /**
   * Sets log.level, event.severity.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-log.html
   * @param eventLevel Mapped to log.level. Example: "info", "error".
   */
  public level(eventLevel: RuleExecutionEventLevel): EcsEventBuilder {
    return this.nested('event', {
      severity: getLevelSeverity(eventLevel),
    }).nested('log', {
      level: eventLevel,
    });
  }

  /**
   * Sets categorization fields: event.kind, event.type, event.action.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-category-field-values-reference.html
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
   * @param eventAction Actual event type. Example: "status-changed".
   */
  public typeChange(eventAction: string): EcsEventBuilder {
    return this.nested('event', {
      kind: 'event',
      type: ['change'],
      action: eventAction,
    });
  }

  /**
   * Sets categorization fields: event.kind, event.type, event.action.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-category-field-values-reference.html
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
   * @param eventAction Actual event type. Example: "metric-search-duration-max", "metric-indexing-lookback".
   */
  public typeMetric(eventAction: string): EcsEventBuilder {
    return this.nested('event', {
      kind: 'metric',
      type: ['info'],
      action: eventAction,
    });
  }

  /**
   * Sets any of the event.* fields.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
   */
  public event(fields: NonNullable<IEcsEvent['event']>): EcsEventBuilder {
    return this.nested('event', fields);
  }

  /**
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-rule.html
   * @param ruleId Dynamic rule id (alert id in the Alerting framework terminology).
   * @param spaceId Kibana space id.
   */
  public rule(ruleId: string, spaceId?: string): EcsEventBuilder {
    const existingSavedObjectRefs = this._result.kibana?.saved_objects ?? [];
    const newSavedObjectRefs = existingSavedObjectRefs.concat({
      type: 'alert',
      id: ruleId,
      namespace: spaceId,
    });

    return this.nested('rule', {
      id: ruleId, // TODO: "id" or "uuid"?
    }).nested('kibana', {
      saved_objects: newSavedObjectRefs,
    });
  }

  /**
   * Sets custom fields representing rule execution status:
   * kibana.detection_engine.{rule_status, rule_status_severity}
   * @param status Execution status of the rule.
   */
  public ruleStatus(status: RuleExecutionStatus): EcsEventBuilder {
    return this.nested('kibana', {
      detection_engine: {
        rule_status: status,
        rule_status_severity: getStatusSeverity(status),
      },
    });
  }

  /**
   * Sets ecs.version.
   * https://www.elastic.co/guide/en/ecs/1.9/ecs-ecs.html
   * @param version Example: 1.7.0
   */
  public ecs(version: string): EcsEventBuilder {
    return this.nested('ecs', {
      version,
    });
  }

  /**
   * Builds and returns the final ECS event.
   */
  public build(): IEcsEvent {
    this.event({
      created: new Date().toISOString(), // TODO: del or use eventDate?
    });
    return this._result;
  }

  private base(fields: IEcsEvent): EcsEventBuilder {
    this._result = { ...this._result, ...fields };
    return this;
  }

  private nested<K extends EcsEventObjectKey, V extends IEcsEvent[K]>(
    key: K,
    fields: V
  ): EcsEventBuilder {
    this._result[key] = {
      ...this._result[key],
      ...fields,
    };
    return this;
  }
}
