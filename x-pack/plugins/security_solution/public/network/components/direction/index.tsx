/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { NetworkDirectionEcs } from '../../../graphql/types';
import { DraggableBadge } from '../../../common/components/draggables';
import { NETWORK_DIRECTION_FIELD_NAME } from '../source_destination/field_names';

export const INBOUND = 'inbound';
export const OUTBOUND = 'outbound';

export const EXTERNAL = 'external';
export const INTERNAL = 'internal';

export const INCOMING = 'incoming';
export const OUTGOING = 'outgoing';

export const LISTENING = 'listening';
export const UNKNOWN = 'unknown';

export const DEFAULT_ICON = 'questionInCircle';

/** Returns an icon representing the value of `network.direction` */
export const getDirectionIcon = (
  networkDirection?: string | null
): 'arrowUp' | 'arrowDown' | 'globe' | 'bullseye' | 'questionInCircle' => {
  if (networkDirection == null) {
    return DEFAULT_ICON;
  }

  const direction = `${networkDirection}`.toLowerCase();

  switch (direction) {
    case NetworkDirectionEcs.outbound:
    case NetworkDirectionEcs.outgoing:
      return 'arrowUp';
    case NetworkDirectionEcs.inbound:
    case NetworkDirectionEcs.incoming:
    case NetworkDirectionEcs.listening:
      return 'arrowDown';
    case NetworkDirectionEcs.external:
      return 'globe';
    case NetworkDirectionEcs.internal:
      return 'bullseye';
    case NetworkDirectionEcs.unknown:
    default:
      return DEFAULT_ICON;
  }
};

/**
 * Renders a badge containing the value of `network.direction`
 */
export const DirectionBadge = React.memo<{
  contextId: string;
  direction?: string | null;
  eventId: string;
}>(({ contextId, eventId, direction }) => (
  <DraggableBadge
    contextId={contextId}
    data-test-subj="network-direction"
    eventId={eventId}
    field={NETWORK_DIRECTION_FIELD_NAME}
    iconType={getDirectionIcon(direction)}
    value={direction}
  />
));

DirectionBadge.displayName = 'DirectionBadge';
