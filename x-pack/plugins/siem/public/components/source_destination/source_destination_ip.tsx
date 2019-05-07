/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, uniqWith } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../ip';
import { DESTINATION_PORT_FIELD_NAME, SOURCE_PORT_FIELD_NAME } from '../port';
import * as i18n from '../timeline/body/renderers/translations';

import { GeoFields } from './geo_fields';
import { IpWithPort } from './ip_with_port';
import { Label } from './label';
import { SourceDestinationIpProps } from './types';

export type SourceDestinationType = 'source' | 'destination';

export interface IpPortPair {
  ip: string;
  port: string | null;
}

/**
 * Returns `true` if the ip field (i.e. `sourceIp`, `destinationIp`) that
 * corresponds with the specified `type` (i.e. `source`, `destination`) is
 * populated
 */
export const isIpFieldPopulated = ({
  destinationIp,
  sourceIp,
  type,
}: {
  destinationIp?: string[] | null;
  sourceIp?: string[] | null;
  type: SourceDestinationType;
}): boolean =>
  (type === 'source' && sourceIp != null) || (type === 'destination' && destinationIp != null);

const IpAdressesWithPorts = pure<{
  contextId: string;
  destinationIp?: string[] | null;
  destinationPort?: string[] | null;
  eventId: string;
  sourceIp?: string[] | null;
  sourcePort?: string[] | null;
  type: SourceDestinationType;
}>(({ contextId, destinationIp, destinationPort, eventId, sourceIp, sourcePort, type }) => {
  const ip = type === 'source' ? sourceIp : destinationIp;
  const ipFieldName = type === 'source' ? SOURCE_IP_FIELD_NAME : DESTINATION_IP_FIELD_NAME;
  const port = type === 'source' ? sourcePort : destinationPort;
  const portFieldName = type === 'source' ? SOURCE_PORT_FIELD_NAME : DESTINATION_PORT_FIELD_NAME;

  if (ip == null) {
    return null; // if ip is not populated as an array, ports will be ignored
  }

  // IMPORTANT: The ip and port arrays are parallel arrays; the port at
  // index `i` corresponds with the ip address at index `i`. We must
  // preserve the relationships between the parallel arrays:
  const ipPortPairs: IpPortPair[] =
    port != null && ip.length === port.length
      ? ip.map((address, i) => ({
          ip: address,
          port: port[i], // use the corresponding port in the parallel array
        }))
      : ip.map(address => ({
          ip: address,
          port: null, // drop the port, because the length of the ip and port arrays is different
        }));

  return ip != null ? (
    <EuiFlexGroup gutterSize="none">
      {uniqWith(isEqual, ipPortPairs).map(
        ipPortPair =>
          ipPortPair.ip != null && (
            <EuiFlexItem grow={false} key={ipPortPair.ip}>
              <IpWithPort
                contextId={contextId}
                data-test-subj={`${type}-ip-and-port`}
                eventId={eventId}
                ip={ipPortPair.ip}
                ipFieldName={ipFieldName}
                port={ipPortPair.port}
                portFieldName={portFieldName}
              />
            </EuiFlexItem>
          )
      )}
    </EuiFlexGroup>
  ) : null;
});

/**
 * When the ip field (i.e. `sourceIp`, `destinationIp`) that corresponds with
 * the specified `type` (i.e. `source`, `destination`) is populated, this component
 * renders:
 * - a label (i.e. `Source` or `Destination`)
 * - a draggable / hyperlinked IP address, when it's populated
 * - a port, hyperlinked to a port lookup service, when it's populated
 * - a summary of geolocation details, when they are populated
 */
export const SourceDestinationIp = pure<SourceDestinationIpProps>(
  ({
    contextId,
    destinationGeoContinentName,
    destinationGeoCountryName,
    destinationGeoCountryIsoCode,
    destinationGeoRegionName,
    destinationGeoCityName,
    destinationIp,
    destinationPort,
    eventId,
    sourceGeoContinentName,
    sourceGeoCountryName,
    sourceGeoCountryIsoCode,
    sourceGeoRegionName,
    sourceGeoCityName,
    sourceIp,
    sourcePort,
    type,
  }) => {
    const label = type === 'source' ? i18n.SOURCE : i18n.DESTINATION;
    return isIpFieldPopulated({ destinationIp, sourceIp, type }) ? (
      <EuiBadge data-test-subj={`${type}-ip-badge`} color="hollow">
        <EuiFlexGroup
          alignItems="center"
          data-test-subj={`${type}-ip-group`}
          direction="column"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            <Label data-test-subj={`${type}-label`}>{label}</Label>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <IpAdressesWithPorts
              contextId={contextId}
              destinationIp={destinationIp}
              destinationPort={destinationPort}
              eventId={eventId}
              sourceIp={sourceIp}
              sourcePort={sourcePort}
              type={type}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <GeoFields
              contextId={contextId}
              destinationGeoContinentName={destinationGeoContinentName}
              destinationGeoCountryName={destinationGeoCountryName}
              destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
              destinationGeoRegionName={destinationGeoRegionName}
              destinationGeoCityName={destinationGeoCityName}
              eventId={eventId}
              sourceGeoContinentName={sourceGeoContinentName}
              sourceGeoCountryName={sourceGeoCountryName}
              sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
              sourceGeoRegionName={sourceGeoRegionName}
              sourceGeoCityName={sourceGeoCityName}
              type={type}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    ) : null;
  }
);
