/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LegacyEndpointEvent, ResolverEvent } from '../types';
import { EventCategory } from '../../public/embeddables/resolver/types';

export function isLegacyEvent(event: ResolverEvent): event is LegacyEndpointEvent {
  return (event as LegacyEndpointEvent).endgame !== undefined;
}

export function eventTimestamp(event: ResolverEvent): string | undefined | number {
  if (isLegacyEvent(event)) {
    return event.endgame.timestamp_utc;
  } else {
    return event['@timestamp'];
  }
}

export function eventName(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.process_name ? event.endgame.process_name : '';
  } else {
    return event.process.name;
  }
}

export function eventId(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.serial_event_id ? String(event.endgame.serial_event_id) : '';
  }
  return event.event.id;
}

export function entityId(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_pid ? String(event.endgame.unique_pid) : '';
  }
  return event.process.entity_id;
}

export function parentEntityId(event: ResolverEvent): string | undefined {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_ppid ? String(event.endgame.unique_ppid) : undefined;
  }
  return event.process.parent?.entity_id;
}

export function eventCategoryDisplayName(event: ResolverEvent): EventCategory {
  const eventTypeToNameMap = new Map<string, EventCategory>([
    [
      'process',
      i18n.translate('xpack.endpoint.resolver.Process', {
        defaultMessage: 'Process',
      }) as EventCategory,
    ],
    [
      'alert',
      i18n.translate('xpack.endpoint.resolver.Alert', {
        defaultMessage: 'Alert',
      }) as EventCategory,
    ],
    [
      'security',
      i18n.translate('xpack.endpoint.resolver.Security', {
        defaultMessage: 'Security',
      }) as EventCategory,
    ],
    [
      'file',
      i18n.translate('xpack.endpoint.resolver.File', {
        defaultMessage: 'File',
      }) as EventCategory,
    ],
    [
      'network',
      i18n.translate('xpack.endpoint.resolver.Network', {
        defaultMessage: 'Network',
      }) as EventCategory,
    ],
    [
      'registry',
      i18n.translate('xpack.endpoint.resolver.Registry', {
        defaultMessage: 'Registry',
      }) as EventCategory,
    ],
    [
      'dns',
      i18n.translate('xpack.endpoint.resolver.DNS', {
        defaultMessage: 'DNS',
      }) as EventCategory,
    ],
    [
      'clr',
      i18n.translate('xpack.endpoint.resolver.CLR', {
        defaultMessage: 'CLR',
      }) as EventCategory,
    ],
    [
      'image_load',
      i18n.translate('xpack.endpoint.resolver.ImageLoad', {
        defaultMessage: 'Image Load',
      }) as EventCategory,
    ],
    [
      'powershell',
      i18n.translate('xpack.endpoint.resolver.Powershell', {
        defaultMessage: 'Powershell',
      }) as EventCategory,
    ],
    [
      'wmi',
      i18n.translate('xpack.endpoint.resolver.WMI', {
        defaultMessage: 'WMI',
      }) as EventCategory,
    ],
    [
      'api',
      i18n.translate('xpack.endpoint.resolver.API', {
        defaultMessage: 'API',
      }) as EventCategory,
    ],
    [
      'user',
      i18n.translate('xpack.endpoint.resolver.User', {
        defaultMessage: 'User',
      }) as EventCategory,
    ],
  ]);

  // Returning "Process" as a catch-all here because it seems pretty general
  let eventCategoryToReturn: EventCategory = 'Process';
  if (isLegacyEvent(event)) {
    const legacyFullType = event.endgame.event_type_full;
    if (legacyFullType) {
      const mappedLegacyCategory = eventTypeToNameMap.get(legacyFullType);
      if (mappedLegacyCategory) {
        eventCategoryToReturn = mappedLegacyCategory;
      }
    }
  } else {
    const eventCategories = event.event.category;
    const eventCategory =
      typeof eventCategories === 'string' ? eventCategories : eventCategories[0] || '';
    const mappedCategoryValue = eventTypeToNameMap.get(eventCategory);
    if (mappedCategoryValue) {
      eventCategoryToReturn = mappedCategoryValue;
    }
  }
  return eventCategoryToReturn;
}
