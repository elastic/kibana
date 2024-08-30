/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { validateDuration } from './validate_duration/latest';
export { validateHours } from './validate_hours/latest';
export { validateTimezone } from './validate_timezone/latest';
export { validateSnoozeSchedule } from './validate_snooze_schedule/latest';

export { validateDuration as validateDurationV1 } from './validate_duration/v1';
export { validateHours as validateHoursV1 } from './validate_hours/v1';
export { validateNotifyWhen as validateNotifyWhenV1 } from './validate_notify_when/v1';
export { validateTimezone as validateTimezoneV1 } from './validate_timezone/v1';
export { validateSnoozeSchedule as validateSnoozeScheduleV1 } from './validate_snooze_schedule/v1';
