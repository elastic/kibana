/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { uniq } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { DirectionBadge } from '../direction';
import { DefaultDraggable, DraggableBadge } from '../draggables';

import * as i18n from './translations';
import {
  NETWORK_BYTES_FIELD_NAME,
  NETWORK_COMMUNITY_ID_FIELD_NAME,
  NETWORK_PACKETS_FIELD_NAME,
  NETWORK_PROTOCOL_FIELD_NAME,
  NETWORK_TRANSPORT_FIELD_NAME,
} from './field_names';
import { PreferenceFormattedBytes } from '../formatted_bytes';

const EuiFlexItemMarginRight = styled(EuiFlexItem)`
  margin-right: 3px;
`;

EuiFlexItemMarginRight.displayName = 'EuiFlexItemMarginRight';

const Stats = styled(EuiText)`
  margin: 0 5px;
`;

Stats.displayName = 'Stats';

/**
 * Renders a row of draggable badges containing fields from the
 * `Network` category of fields
 */
export const Network = React.memo<{
  bytes?: string[] | null;
  communityId?: string[] | null;
  contextId: string;
  direction?: string[] | null;
  eventId: string;
  packets?: string[] | null;
  protocol?: string[] | null;
  transport?: string[] | null;
}>(({ bytes, communityId, contextId, direction, eventId, packets, protocol, transport }) => (
  <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
    {direction != null
      ? uniq(direction).map(dir => (
          <EuiFlexItemMarginRight grow={false} key={dir}>
            <DirectionBadge contextId={contextId} eventId={eventId} direction={dir} />
          </EuiFlexItemMarginRight>
        ))
      : null}

    {protocol != null
      ? uniq(protocol).map(proto => (
          <EuiFlexItemMarginRight grow={false} key={proto}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="network-protocol"
              eventId={eventId}
              field={NETWORK_PROTOCOL_FIELD_NAME}
              value={proto}
            />
          </EuiFlexItemMarginRight>
        ))
      : null}

    {bytes != null
      ? uniq(bytes).map(b =>
          !isNaN(Number(b)) ? (
            <EuiFlexItemMarginRight grow={false} key={b}>
              <DefaultDraggable
                field={NETWORK_BYTES_FIELD_NAME}
                id={`network-default-draggable-${contextId}-${eventId}-${NETWORK_BYTES_FIELD_NAME}-${b}`}
                value={b}
              >
                <Stats size="xs">
                  <span data-test-subj="network-bytes">
                    <PreferenceFormattedBytes value={b} />
                  </span>
                </Stats>
              </DefaultDraggable>
            </EuiFlexItemMarginRight>
          ) : null
        )
      : null}

    {packets != null
      ? uniq(packets).map(p => (
          <EuiFlexItemMarginRight grow={false} key={p}>
            <DefaultDraggable
              field={NETWORK_PACKETS_FIELD_NAME}
              id={`network-default-draggable-${contextId}-${eventId}-${NETWORK_PACKETS_FIELD_NAME}-${p}`}
              value={p}
            >
              <Stats size="xs">
                <span data-test-subj="network-packets">{`${p} ${i18n.PACKETS}`}</span>
              </Stats>
            </DefaultDraggable>
          </EuiFlexItemMarginRight>
        ))
      : null}

    {transport != null
      ? uniq(transport).map(trans => (
          <EuiFlexItemMarginRight grow={false} key={trans}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="network-transport"
              eventId={eventId}
              field={NETWORK_TRANSPORT_FIELD_NAME}
              value={trans}
            />
          </EuiFlexItemMarginRight>
        ))
      : null}

    {communityId != null
      ? uniq(communityId).map(trans => (
          <EuiFlexItem grow={false} key={trans}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="network-community-id"
              eventId={eventId}
              field={NETWORK_COMMUNITY_ID_FIELD_NAME}
              value={trans}
            />
          </EuiFlexItem>
        ))
      : null}
  </EuiFlexGroup>
));

Network.displayName = 'Network';
