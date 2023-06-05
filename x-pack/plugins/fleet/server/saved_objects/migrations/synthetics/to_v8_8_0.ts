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
  if (
    packagePolicyDoc.attributes.package?.name !== 'synthetics' ||
    !packagePolicyDoc.attributes.is_managed
  ) {
    return packagePolicyDoc;
  }

  const agentPolicyId = packagePolicyDoc.attributes.policy_id;

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
    enabledStream.compiled_stream?.schedule
  ) {
    const schedule = enabledStream.vars.schedule.value.match(/\d+\.?\d*/g)?.[0];
    const updatedSchedule = getNearestSupportedSchedule(schedule);
    const formattedUpdatedSchedule = `@every ${updatedSchedule}m`;
    enabledStream.vars.schedule.value = `"${formattedUpdatedSchedule}"`;
    enabledStream.compiled_stream.schedule = formattedUpdatedSchedule;
  }

  if (
    enabledStream.data_stream.dataset === 'browser' &&
    enabledStream.vars?.['throttling.config'] &&
    enabledStream.compiled_stream?.throttling
  ) {
    const throttling = enabledStream.vars['throttling.config'].value;
    if (throttling) {
      const formattedThrottling = handleThrottling(throttling);
      enabledStream.vars['throttling.config'].value = JSON.stringify(formattedThrottling);
      enabledStream.compiled_stream.throttling = formattedThrottling;
    }
  }

  // set location_id.id to agentPolicyId
  if (enabledStream.vars) {
    enabledStream.vars.location_id = { value: agentPolicyId, type: 'text' };
    enabledStream.compiled_stream.location_id = agentPolicyId;
  }

  return updatedPackagePolicyDoc;
};

const handleThrottling = (
  throttling: string
): { download: number; upload: number; latency: number } => {
  try {
    const [download = 5, upload = 3, latency = 20] = throttling.match(/\d+\.?\d*/g) || [];
    return {
      download: Number(download),
      upload: Number(upload),
      latency: Number(latency),
    };
  } catch {
    return {
      download: 5,
      upload: 3,
      latency: 20,
    };
  }
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
