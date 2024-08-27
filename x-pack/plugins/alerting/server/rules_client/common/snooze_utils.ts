/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Rule,
  RuleDomain,
  RuleParams,
  RuleSnoozeSchedule as RuleDomainSnoozeSchedule,
} from '../../application/rule/types';
import { RuleAttributes } from '../../data/rule/types';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';

export function getSnoozeAttributes(
  attributes: RuleAttributes,
  snoozeSchedule: RuleDomainSnoozeSchedule
) {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnoozeAttributes(attributes),
    };
  }

  return {
    snoozeSchedule: (snoozeId
      ? clearScheduledSnoozesAttributesById(attributes, [snoozeId])
      : clearUnscheduledSnoozeAttributes(attributes)
    ).concat(snoozeSchedule),
  };
}

export function getBulkSnooze<Params extends RuleParams>(
  rule: RuleDomain<Params>,
  snoozeSchedule: RuleDomainSnoozeSchedule
): {
  muteAll: RuleDomain<Params>['muteAll'];
  snoozeSchedule: RuleDomain<Params>['snoozeSchedule'];
} {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnooze<Params>(rule),
    };
  }

  // Bulk adding snooze schedule, don't touch the existing snooze/indefinite snooze
  if (snoozeId) {
    const existingSnoozeSchedules = rule.snoozeSchedule || [];
    return {
      muteAll: rule.muteAll,
      snoozeSchedule: [...existingSnoozeSchedules, snoozeSchedule],
    };
  }

  // Bulk snoozing, don't touch the existing snooze schedules
  return {
    muteAll: false,
    snoozeSchedule: [...(clearUnscheduledSnooze<Params>(rule) || []), snoozeSchedule],
  };
}

export function getUnsnoozeAttributes(attributes: RuleAttributes, scheduleIds?: string[]) {
  const snoozeSchedule = scheduleIds
    ? clearScheduledSnoozesAttributesById(attributes, scheduleIds)
    : clearCurrentActiveSnoozeAttributes(attributes);

  return {
    snoozeSchedule,
    ...(!scheduleIds ? { muteAll: false } : {}),
  };
}

export function getBulkUnsnooze<Params extends RuleParams>(
  rule: RuleDomain<Params>,
  scheduleIds?: string[]
) {
  // Bulk removing snooze schedules, don't touch the current snooze/indefinite snooze
  if (scheduleIds) {
    const newSchedules = clearScheduledSnoozesById(rule, scheduleIds);
    // Unscheduled snooze is also known as snooze now
    const unscheduledSnooze = rule.snoozeSchedule?.filter((s) => typeof s.id === 'undefined') || [];

    return {
      snoozeSchedule: [...unscheduledSnooze, ...newSchedules],
      muteAll: rule.muteAll,
    };
  }

  // Bulk unsnoozing, don't touch current snooze schedules that are NOT active
  return {
    snoozeSchedule: clearCurrentActiveSnooze(rule),
    muteAll: false,
  };
}

export function clearUnscheduledSnoozeAttributes(attributes: RuleAttributes) {
  // Clear any snoozes that have no ID property. These are "simple" snoozes created with the quick UI, e.g. snooze for 3 days starting now
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => typeof s.id !== 'undefined')
    : [];
}

export function clearUnscheduledSnooze<Params extends RuleParams>(rule: RuleDomain<Params>) {
  return rule.snoozeSchedule ? rule.snoozeSchedule.filter((s) => typeof s.id !== 'undefined') : [];
}

export function clearScheduledSnoozesAttributesById(attributes: RuleAttributes, ids: string[]) {
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => !(s.id && ids.includes(s.id)))
    : [];
}

export function clearScheduledSnoozesById<Params extends RuleParams>(
  rule: RuleDomain<Params>,
  ids: string[]
) {
  return rule.snoozeSchedule ? rule.snoozeSchedule.filter((s) => s.id && !ids.includes(s.id)) : [];
}

export function clearCurrentActiveSnoozeAttributes(attributes: RuleAttributes) {
  // First attempt to cancel a simple (unscheduled) snooze
  const clearedUnscheduledSnoozes = clearUnscheduledSnoozeAttributes(attributes);
  // Now clear any scheduled snoozes that are currently active and never recur
  // @ts-expect-error upgrade typescript v5.1.6
  const activeSnoozes = getActiveScheduledSnoozes(attributes);
  const activeSnoozeIds = activeSnoozes?.map((s) => s.id) ?? [];
  const recurringSnoozesToSkip: string[] = [];
  const clearedNonRecurringActiveSnoozes = clearedUnscheduledSnoozes.filter((s) => {
    if (!activeSnoozeIds.includes(s.id!)) return true;
    // Check if this is a recurring snooze, and return true if so
    if (s.rRule.freq && s.rRule.count !== 1) {
      recurringSnoozesToSkip.push(s.id!);
      return true;
    }
  });
  const clearedSnoozesAndSkippedRecurringSnoozes = clearedNonRecurringActiveSnoozes.map((s) => {
    if (s.id && !recurringSnoozesToSkip.includes(s.id)) return s;
    const currentRecurrence = activeSnoozes?.find((a) => a.id === s.id)?.lastOccurrence;
    if (!currentRecurrence) return s;
    return {
      ...s,
      skipRecurrences: (s.skipRecurrences ?? []).concat(currentRecurrence.toISOString()),
    };
  });
  return clearedSnoozesAndSkippedRecurringSnoozes;
}

export function clearCurrentActiveSnooze<Params extends RuleParams>(rule: RuleDomain<Params>) {
  // First attempt to cancel a simple (unscheduled) snooze
  const clearedUnscheduledSnoozes = clearUnscheduledSnooze(rule);
  // Now clear any scheduled snoozes that are currently active and never recur
  // @ts-expect-error upgrade typescript v5.1.6
  const activeSnoozes = getActiveScheduledSnoozes(rule);
  const activeSnoozeIds = activeSnoozes?.map((s) => s.id) ?? [];
  const recurringSnoozesToSkip: string[] = [];
  const clearedNonRecurringActiveSnoozes = clearedUnscheduledSnoozes.filter((s) => {
    if (!activeSnoozeIds.includes(s.id!)) return true;
    // Check if this is a recurring snooze, and return true if so
    if (s.rRule.freq && s.rRule.count !== 1) {
      recurringSnoozesToSkip.push(s.id!);
      return true;
    }
  });
  const clearedSnoozesAndSkippedRecurringSnoozes = clearedNonRecurringActiveSnoozes.map((s) => {
    if (s.id && !recurringSnoozesToSkip.includes(s.id)) return s;
    const currentRecurrence = activeSnoozes?.find((a) => a.id === s.id)?.lastOccurrence;
    if (!currentRecurrence) return s;
    return {
      ...s,
      skipRecurrences: (s.skipRecurrences ?? []).concat(currentRecurrence.toISOString()),
    };
  });
  return clearedSnoozesAndSkippedRecurringSnoozes;
}

export function verifySnoozeAttributeScheduleLimit(attributes: Partial<Rule>) {
  const schedules = attributes.snoozeSchedule?.filter((snooze) => snooze.id);
  if (schedules && schedules.length > 5) {
    throw Error(
      i18n.translate('xpack.alerting.rulesClient.snoozeSchedule.limitReached', {
        defaultMessage: 'Rule cannot have more than 5 snooze schedules',
      })
    );
  }
}

export function verifySnoozeScheduleLimit<Params extends RuleParams>(
  snoozeSchedule: RuleDomain<Params>['snoozeSchedule']
) {
  const schedules = snoozeSchedule?.filter((snooze) => snooze.id);
  if (schedules && schedules.length > 5) {
    throw Error(
      i18n.translate('xpack.alerting.rulesClient.snoozeSchedule.limitReached', {
        defaultMessage: 'Rule cannot have more than 5 snooze schedules',
      })
    );
  }
}
