/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface NetflowColumnsProps {
  contextId: string;
  destinationBytes?: string[] | null;
  destinationGeoContinentName?: string[] | null;
  destinationGeoCountryName?: string[] | null;
  destinationGeoCountryIsoCode?: string[] | null;
  destinationGeoRegionName?: string[] | null;
  destinationGeoCityName?: string[] | null;
  destinationIp?: string[] | null;
  destinationPackets?: string[] | null;
  destinationPort?: string[] | null;
  direction?: string[] | null;
  eventDuration?: string[] | null;
  eventId: string;
  eventEnd?: string[] | null;
  eventStart?: string[] | null;
  networkBytes?: string[] | null;
  networkCommunityId?: string[] | null;
  networkDirection?: string[] | null;
  networkPackets?: string[] | null;
  networkProtocol?: string[] | null;
  processName?: string[] | null;
  sourceBytes?: string[] | null;
  sourceGeoContinentName?: string[] | null;
  sourceGeoCountryName?: string[] | null;
  sourceGeoCountryIsoCode?: string[] | null;
  sourceGeoRegionName?: string[] | null;
  sourceGeoCityName?: string[] | null;
  sourceIp?: string[] | null;
  sourcePackets?: string[] | null;
  sourcePort?: string[] | null;
  transport?: string[] | null;
  userName?: string[] | null;
}
