/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RawRule, RuleSnoozeSchedule } from '../../types';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';

export function getSnoozeAttributes(attributes: RawRule, snoozeSchedule: RuleSnoozeSchedule) {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnooze(attributes),
    };
  }
  return {
    snoozeSchedule: (snoozeId
      ? clearScheduledSnoozesById(attributes, [snoozeId])
      : clearUnscheduledSnooze(attributes)
    ).concat(snoozeSchedule),
    muteAll: false,
  };
}

export function getBulkSnoozeAttributes(attributes: RawRule, snoozeSchedule: RuleSnoozeSchedule) {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnooze(attributes),
    };
  }

  // Bulk adding snooze schedule, don't touch the existing snooze/indefinite snooze
  if (snoozeId) {
    const existingSnoozeSchedules = attributes.snoozeSchedule || [];
    return {
      muteAll: attributes.muteAll,
      snoozeSchedule: [...existingSnoozeSchedules, snoozeSchedule],
    };
  }

  // Bulk snoozing, don't touch the existing snooze schedules
  return {
    muteAll: false,
    snoozeSchedule: [...clearUnscheduledSnooze(attributes), snoozeSchedule],
  };
}

export function getUnsnoozeAttributes(attributes: RawRule, scheduleIds?: string[]) {
  const snoozeSchedule = scheduleIds
    ? clearScheduledSnoozesById(attributes, scheduleIds)
    : clearCurrentActiveSnooze(attributes);

  return {
    snoozeSchedule,
    ...(!scheduleIds ? { muteAll: false } : {}),
  };
}

export function getBulkUnsnoozeAttributes(attributes: RawRule, scheduleIds?: string[]) {
  // Bulk removing snooze schedules, don't touch the current snooze/indefinite snooze
  if (scheduleIds) {
    const newSchedules = clearScheduledSnoozesById(attributes, scheduleIds);
    // Unscheduled snooze is also known as snooze now
    const unscheduledSnooze =
      attributes.snoozeSchedule?.filter((s) => typeof s.id === 'undefined') || [];

    return {
      snoozeSchedule: [...unscheduledSnooze, ...newSchedules],
      muteAll: attributes.muteAll,
    };
  }

  // Bulk unsnoozing, don't touch current snooze schedules that are NOT active
  return {
    snoozeSchedule: clearCurrentActiveSnooze(attributes),
    muteAll: false,
  };
}

export function clearUnscheduledSnooze(attributes: RawRule) {
  // Clear any snoozes that have no ID property. These are "simple" snoozes created with the quick UI, e.g. snooze for 3 days starting now
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => typeof s.id !== 'undefined')
    : [];
}

export function clearScheduledSnoozesById(attributes: RawRule, ids: string[]) {
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => s.id && !ids.includes(s.id))
    : [];
}

export function clearCurrentActiveSnooze(attributes: RawRule) {
  // First attempt to cancel a simple (unscheduled) snooze
  const clearedUnscheduledSnoozes = clearUnscheduledSnooze(attributes);
  // Now clear any scheduled snoozes that are currently active and never recur
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

export function verifySnoozeScheduleLimit(attributes: Partial<RawRule>) {
  const schedules = attributes.snoozeSchedule?.filter((snooze) => snooze.id);
  if (schedules && schedules.length > 5) {
    throw Error(
      i18n.translate('xpack.alerting.rulesClient.snoozeSchedule.limitReached', {
        defaultMessage: 'Rule cannot have more than 5 snooze schedules',
      })
    );
  }
}
