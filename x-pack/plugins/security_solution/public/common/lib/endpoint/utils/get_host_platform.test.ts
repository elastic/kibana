/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { getHostPlatform } from './get_host_platform';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

describe('getHostPlatform() util', () => {
  const buildEcsData = (data: Record<string, string>) => {
    const ecsData = {};

    for (const [key, value] of Object.entries(data)) {
      set(ecsData, `host.os.${key}`, value);
    }

    return ecsData;
  };

  const buildEventDetails = (data: Record<string, string>) => {
    const eventDetails: TimelineEventsDetailsItem[] = [];

    for (const [key, value] of Object.entries(data)) {
      eventDetails.push({
        category: 'host',
        field: `host.os.${key}`,
        values: [value],
        originalValue: value,
        isObjectArray: false,
      });
    }

    return eventDetails;
  };

  it.each`
    title                                              | setupData                                                                | expectedResult
    ${'ECS data with host.os.platform info'}           | ${buildEcsData({ platform: 'windows' })}                                 | ${'windows'}
    ${'ECS data with host.os.type info'}               | ${buildEcsData({ type: 'Linux' })}                                       | ${'linux'}
    ${'ECS data with host.os.name info'}               | ${buildEcsData({ name: 'MACOS' })}                                       | ${'macos'}
    ${'ECS data with all os info'}                     | ${buildEcsData({ platform: 'macos', type: 'windows', name: 'linux' })}   | ${'windows'}
    ${'Event Details data with host.os.platform info'} | ${buildEventDetails({ platform: 'windows' })}                            | ${'windows'}
    ${'Event Details data with host.os.type info'}     | ${buildEventDetails({ type: 'Linux' })}                                  | ${'linux'}
    ${'Event Details data with host.os.name info'}     | ${buildEventDetails({ name: 'MACOS' })}                                  | ${'macos'}
    ${'Event Details data with all os info'}           | ${buildEventDetails({ platform: 'macos', type: 'win2', name: 'linux' })} | ${'linux'}
  `(`should handle $title`, ({ setupData, expectedResult }) => {
    expect(getHostPlatform(setupData)).toEqual(expectedResult);
  });
});
