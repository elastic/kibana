/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';

interface SavedObject {
  type: string;
  id: string;
  rel?: string;
  type_id: string;
}

interface ValidateEventLogParams {
  spaceId: string;
  savedObjects: SavedObject[];
  outcome?: string;
  message: string;
  shouldHaveEventEnd?: boolean;
  shouldHaveTask?: boolean;
  errorMessage?: string;
  status?: string;
  actionGroupId?: string;
  instanceId?: string;
  reason?: string;
  executionId?: string;
  numTriggeredActions?: number;
  numActiveAlerts?: number;
  numRecoveredAlerts?: number;
  numNewAlerts?: number;
  consumer?: string;
  ruleTypeId: string;
  rule?: {
    id: string;
    name?: string;
    version?: string;
    category?: string;
    reference?: string;
    author?: string[];
    license?: string;
    ruleset?: string;
    namespace?: string;
  };
  flapping?: boolean;
  source?: string;
}

export const InstanceActions = new Set<string | undefined>([
  'new-instance',
  'active-instance',
  'recovered-instance',
  'untracked-instance',
]);

export function validateEvent(event: IValidatedEvent, params: ValidateEventLogParams): void {
  const {
    spaceId,
    savedObjects,
    outcome,
    message,
    errorMessage,
    rule,
    shouldHaveTask,
    executionId,
    numTriggeredActions = 1,
    numActiveAlerts,
    numNewAlerts,
    numRecoveredAlerts,
    consumer,
    ruleTypeId,
    flapping,
    source,
  } = params;
  const { status, actionGroupId, instanceId, reason, shouldHaveEventEnd } = params;

  if (event?.event?.action === 'execute' && status === 'active') {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.number_of_triggered_actions).to.be(
      numTriggeredActions
    );
  }

  if (status) {
    expect(event?.kibana?.alerting?.status).to.be(status);
  }

  if (actionGroupId) {
    expect(event?.kibana?.alerting?.action_group_id).to.be(actionGroupId);
  }

  if (instanceId) {
    expect(event?.kibana?.alerting?.instance_id).to.be(instanceId);
  }

  if (InstanceActions.has(event?.event?.action)) {
    expect(typeof event?.kibana?.alert?.uuid).to.be('string');
  } else {
    expect(event?.kibana?.alert?.uuid).to.be(undefined);
  }

  if (reason) {
    expect(event?.event?.reason).to.be(reason);
  }

  if (executionId) {
    expect(event?.kibana?.alert?.rule?.execution?.uuid).to.be(executionId);
  }

  if (consumer) {
    expect(event?.kibana?.alert?.rule?.consumer).to.be(consumer);
  }

  if (numActiveAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.be(
      numActiveAlerts
    );
  }

  if (numRecoveredAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.recovered).to.be(
      numRecoveredAlerts
    );
  }

  if (numNewAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.be(numNewAlerts);
  }

  if (flapping !== undefined) {
    expect(event?.kibana?.alert?.flapping).to.be(flapping);
  }

  if (source) {
    expect(event?.kibana?.action?.execution?.source).to.be(source);
  }

  expect(event?.kibana?.alert?.rule?.rule_type_id).to.be(ruleTypeId);
  expect(event?.kibana?.space_ids?.[0]).to.equal(spaceId);

  const duration = event?.event?.duration;
  const timestamp = Date.parse(event?.['@timestamp'] || 'undefined');
  const eventStart = Date.parse(event?.event?.start || 'undefined');
  const eventEnd = Date.parse(event?.event?.end || 'undefined');
  const dateNow = Date.now();

  if (duration !== undefined) {
    expect(typeof duration).to.be('string');
    expect(eventStart).to.be.ok();

    if (shouldHaveEventEnd !== false) {
      expect(eventEnd).to.be.ok();

      const durationDiff = Math.abs(nanosToMillis(duration!) - (eventEnd - eventStart));

      // account for rounding errors
      expect(durationDiff < 1).to.equal(true);
      expect(eventStart <= eventEnd).to.equal(true);
      expect(eventEnd <= dateNow).to.equal(true);
      expect(eventEnd <= timestamp).to.equal(true);
    }

    if (shouldHaveEventEnd === false) {
      expect(eventEnd).not.to.be.ok();
    }
  }

  expect(event?.event?.outcome).to.equal(outcome);

  for (const savedObject of savedObjects) {
    expect(
      isSavedObjectInEvent(event, spaceId, savedObject.type, savedObject.id, savedObject.rel)
    ).to.be(true);

    // event?.kibana?.alerting?.outcome is only populated for alerts
    if (savedObject.type === 'alert') {
      expect(event?.kibana?.alerting?.outcome).to.equal(outcome);
    }
  }

  expect(event?.message).to.eql(message);

  expect(event?.rule).to.eql(rule);

  if (shouldHaveTask) {
    const task = event?.kibana?.task;
    expect(task).to.be.ok();
    expect(typeof Date.parse(typeof task?.scheduled)).to.be('number');
    expect(typeof task?.schedule_delay).to.be('number');
    expect(task?.schedule_delay).to.be.greaterThan(-1);
  } else {
    expect(event?.kibana?.task).to.be(undefined);
  }

  if (errorMessage) {
    expect(event?.error?.message).to.eql(errorMessage);
  }
}

function isSavedObjectInEvent(
  event: IValidatedEvent,
  spaceId: string,
  type: string,
  id: string,
  rel?: string
): boolean {
  const savedObjects = event?.kibana?.saved_objects ?? [];
  const namespace = spaceId === 'default' ? undefined : spaceId;

  for (const savedObject of savedObjects) {
    if (
      savedObject.namespace === namespace &&
      savedObject.type === type &&
      savedObject.id === id &&
      savedObject.rel === rel
    ) {
      return true;
    }
  }

  return false;
}
