/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

export const ALLOWED_SCHEDULES_IN_MINUTES = [
  '1',
  '3',
  '5',
  '10',
  '15',
  '20',
  '30',
  '60',
  '120',
  '240',
];

export const migratePackagePolicyToV880: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  if (packagePolicyDoc.attributes.package?.name !== 'synthetics') {
    return packagePolicyDoc;
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  const enabledInput = updatedPackagePolicyDoc.attributes.inputs.find(
    (input) => input.enabled === true
  );
  const enabledStream = enabledInput?.streams.find((stream) => {
    return ['browser', 'http', 'icmp', 'tcp'].includes(stream.data_stream.dataset);
  });
  if (!enabledStream) {
    return updatedPackagePolicyDoc;
  }

  if (
    enabledStream.vars &&
    enabledStream.vars.schedule?.value &&
    enabledStream.compiled_stream.schedule
  ) {
    const schedule = enabledStream.vars.schedule.value.match(/\d+/g)?.[0];
    const updatedSchedule = getNearestSupportedSchedule(schedule);
    const formattedUpdatedSchedule = `@every ${updatedSchedule}m`;
    enabledStream.vars.schedule.value = `@every ${updatedSchedule}m`;
    enabledStream.compiled_stream.schedule = formattedUpdatedSchedule;
  }

  return updatedPackagePolicyDoc;
};

const getNearestSupportedSchedule = (currentSchedule: string): string => {
  try {
    const closest = ALLOWED_SCHEDULES_IN_MINUTES.reduce(function (prev, curr) {
      const supportedSchedule = parseFloat(curr);
      const currSchedule = parseFloat(currentSchedule);
      const prevSupportedSchedule = parseFloat(prev);
      return Math.abs(supportedSchedule - currSchedule) <
        Math.abs(prevSupportedSchedule - currSchedule)
        ? curr
        : prev;
    });

    return closest;
  } catch {
    return '10';
  }
};
