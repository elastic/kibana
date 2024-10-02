/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '@elastic/ecs';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';
import { getAlertDetailsFieldValue } from './get_event_details_field_values';
import type { Platform } from '../../../../management/components/endpoint_responder/components/header_info/platforms';

type EcsHostData = MaybeImmutable<Pick<Ecs, 'host'>>;

const isTimelineEventDetailsItems = (
  data: EcsHostData | TimelineEventsDetailsItem[]
): data is TimelineEventsDetailsItem[] => {
  return Array.isArray(data);
};

/**
 * Retrieve a host's platform type from either ECS data or Event Details list of items
 * @param data
 */
export const getHostPlatform = (data: EcsHostData | TimelineEventsDetailsItem[]): Platform => {
  let platform = '';

  if (isTimelineEventDetailsItems(data)) {
    platform = (getAlertDetailsFieldValue({ category: 'host', field: 'host.os.platform' }, data) ||
      getAlertDetailsFieldValue({ category: 'host', field: 'host.os.type' }, data) ||
      getAlertDetailsFieldValue({ category: 'host', field: 'host.os.name' }, data)) as Platform;
  } else {
    platform =
      ((data.host?.os?.platform || data.host?.os?.type || data.host?.os?.name) as Platform) || '';
  }

  return platform.toLowerCase() as Platform;
};
