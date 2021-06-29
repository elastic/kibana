/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRendererId, RowRenderer } from '../../../../../../../common/types/timeline';
import { asArrayIfExists } from '../../../../../../common/lib/helpers';
import {
  TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
  TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
} from '../../../../certificate_fingerprint';
import { EVENT_DURATION_FIELD_NAME } from '../../../../duration';
import { ID_FIELD_NAME } from '../../../../../../common/components/event_details/event_id';
import {
  DESTINATION_IP_FIELD_NAME,
  SOURCE_IP_FIELD_NAME,
} from '../../../../../../network/components/ip';
import { JA3_HASH_FIELD_NAME } from '../../../../ja3_fingerprint';
import { Netflow } from '../../../../netflow';
import {
  EVENT_END_FIELD_NAME,
  EVENT_START_FIELD_NAME,
} from '../../../../netflow/netflow_columns/duration_event_start_end';
import {
  PROCESS_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../../netflow/netflow_columns/user_process';
import {
  DESTINATION_PORT_FIELD_NAME,
  SOURCE_PORT_FIELD_NAME,
} from '../../../../../../network/components/port';
import {
  NETWORK_BYTES_FIELD_NAME,
  NETWORK_COMMUNITY_ID_FIELD_NAME,
  NETWORK_DIRECTION_FIELD_NAME,
  NETWORK_PACKETS_FIELD_NAME,
  NETWORK_PROTOCOL_FIELD_NAME,
  NETWORK_TRANSPORT_FIELD_NAME,
} from '../../../../../../network/components/source_destination/field_names';
import {
  DESTINATION_GEO_CITY_NAME_FIELD_NAME,
  DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME,
  DESTINATION_GEO_REGION_NAME_FIELD_NAME,
  SOURCE_GEO_CITY_NAME_FIELD_NAME,
  SOURCE_GEO_CONTINENT_NAME_FIELD_NAME,
  SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  SOURCE_GEO_COUNTRY_NAME_FIELD_NAME,
  SOURCE_GEO_REGION_NAME_FIELD_NAME,
} from '../../../../../../network/components/source_destination/geo_fields';
import {
  DESTINATION_BYTES_FIELD_NAME,
  DESTINATION_PACKETS_FIELD_NAME,
  SOURCE_BYTES_FIELD_NAME,
  SOURCE_PACKETS_FIELD_NAME,
} from '../../../../../../network/components/source_destination/source_destination_arrows';
import { RowRendererContainer } from '../row_renderer';

const Details = styled.div`
  margin: 5px 0;
`;
Details.displayName = 'Details';

const EVENT_CATEGORY_FIELD = 'event.category';
const EVENT_ACTION_FIELD = 'event.action';
const NETWORK_TRAFFIC = 'network_traffic';
const NETWORK_FLOW = 'network_flow';
const NETFLOW_FLOW = 'netflow_flow';

export const eventCategoryMatches = (eventCategory: string | object | undefined | null): boolean =>
  `${eventCategory}`.toLowerCase() === NETWORK_TRAFFIC;

export const eventActionMatches = (eventAction: string | object | undefined | null): boolean => {
  const action = `${eventAction}`.toLowerCase();

  return action === NETWORK_FLOW || action === NETFLOW_FLOW;
};

export const netflowRowRenderer: RowRenderer = {
  id: RowRendererId.netflow,
  isInstance: (ecs) =>
    eventCategoryMatches(get(EVENT_CATEGORY_FIELD, ecs)) ||
    eventActionMatches(get(EVENT_ACTION_FIELD, ecs)),
  renderRow: ({ data, timelineId }) => (
    <RowRendererContainer>
      <Details>
        <Netflow
          contextId={`netflow-row-renderer-render-row-${timelineId}-${data._id}`}
          destinationBytes={asArrayIfExists(get(DESTINATION_BYTES_FIELD_NAME, data))}
          destinationGeoContinentName={asArrayIfExists(
            get(DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME, data)
          )}
          destinationGeoCountryName={asArrayIfExists(
            get(DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME, data)
          )}
          destinationGeoCountryIsoCode={asArrayIfExists(
            get(DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME, data)
          )}
          destinationGeoRegionName={asArrayIfExists(
            get(DESTINATION_GEO_REGION_NAME_FIELD_NAME, data)
          )}
          destinationGeoCityName={asArrayIfExists(get(DESTINATION_GEO_CITY_NAME_FIELD_NAME, data))}
          destinationIp={asArrayIfExists(get(DESTINATION_IP_FIELD_NAME, data))}
          destinationPackets={asArrayIfExists(get(DESTINATION_PACKETS_FIELD_NAME, data))}
          destinationPort={asArrayIfExists(get(DESTINATION_PORT_FIELD_NAME, data))}
          eventDuration={asArrayIfExists(get(EVENT_DURATION_FIELD_NAME, data))}
          eventId={get(ID_FIELD_NAME, data)}
          eventEnd={asArrayIfExists(get(EVENT_END_FIELD_NAME, data))}
          eventStart={asArrayIfExists(get(EVENT_START_FIELD_NAME, data))}
          networkBytes={asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, data))}
          networkCommunityId={asArrayIfExists(get(NETWORK_COMMUNITY_ID_FIELD_NAME, data))}
          networkDirection={asArrayIfExists(get(NETWORK_DIRECTION_FIELD_NAME, data))}
          networkPackets={asArrayIfExists(get(NETWORK_PACKETS_FIELD_NAME, data))}
          networkProtocol={asArrayIfExists(get(NETWORK_PROTOCOL_FIELD_NAME, data))}
          processName={asArrayIfExists(get(PROCESS_NAME_FIELD_NAME, data))}
          sourceBytes={asArrayIfExists(get(SOURCE_BYTES_FIELD_NAME, data))}
          sourceGeoContinentName={asArrayIfExists(get(SOURCE_GEO_CONTINENT_NAME_FIELD_NAME, data))}
          sourceGeoCountryName={asArrayIfExists(get(SOURCE_GEO_COUNTRY_NAME_FIELD_NAME, data))}
          sourceGeoCountryIsoCode={asArrayIfExists(
            get(SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME, data)
          )}
          sourceGeoRegionName={asArrayIfExists(get(SOURCE_GEO_REGION_NAME_FIELD_NAME, data))}
          sourceGeoCityName={asArrayIfExists(get(SOURCE_GEO_CITY_NAME_FIELD_NAME, data))}
          sourceIp={asArrayIfExists(get(SOURCE_IP_FIELD_NAME, data))}
          sourcePackets={asArrayIfExists(get(SOURCE_PACKETS_FIELD_NAME, data))}
          sourcePort={asArrayIfExists(get(SOURCE_PORT_FIELD_NAME, data))}
          tlsClientCertificateFingerprintSha1={asArrayIfExists(
            get(TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME, data)
          )}
          tlsFingerprintsJa3Hash={asArrayIfExists(get(JA3_HASH_FIELD_NAME, data))}
          tlsServerCertificateFingerprintSha1={asArrayIfExists(
            get(TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME, data)
          )}
          transport={asArrayIfExists(get(NETWORK_TRANSPORT_FIELD_NAME, data))}
          userName={asArrayIfExists(get(USER_NAME_FIELD_NAME, data))}
        />
      </Details>
    </RowRendererContainer>
  ),
};
