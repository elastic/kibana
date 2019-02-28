/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extendMap } from './extend_map';

export const osFieldsMap: Readonly<Record<string, string>> = {
  'os.platform': 'os.platform',
  'os.name': 'os.name',
  'os.full': 'os.full',
  'os.family': 'os.family',
  'os.version': 'os.version',
  'os.kernel': 'os.kernel',
};

export const hostFieldsMap: Readonly<Record<string, string>> = {
  'host.architecture': 'host.architecture',
  'host.id': 'host.id',
  'host.ip': 'host.ip',
  'host.mac': 'host.mac',
  'host.name': 'host.name',
  'host.type': 'cloud.machine.type',
  ...extendMap('host', osFieldsMap),
};

export const processFieldsMap: Readonly<Record<string, string>> = {
  'process.pid': 'process.pid',
  'process.name': 'process.name',
  'process.ppid': 'process.ppid',
  'process.args': 'process.args',
  'process.executable': 'process.executable',
  'process.title': 'process.title',
  'process.thread': 'process.thread',
  'process.working_directory': 'process.working_directory',
};

export const userFieldsMap: Readonly<Record<string, string>> = {
  'user.id': 'user.id',
  'user.name': 'user.name',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.full_name': 'user.full_name',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.email': 'user.email',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.hash': 'user.hash',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.group': 'user.group',
};

export const suricataFieldsMap: Readonly<Record<string, string>> = {
  'suricata.eve.flow_id': 'suricata.eve.flow_id',
  'suricata.eve.proto': 'suricata.eve.proto',
  'suricata.eve.alert.signature': 'suricata.eve.alert.signature',
  'suricata.eve.alert.signature_id': 'suricata.eve.alert.signature_id',
};

export const sourceFieldsMap: Readonly<Record<string, string>> = {
  'source.ip': 'source.ip',
  'source.port': 'source.port',
  'source.domain': 'source.domain',
};

export const destinationFieldsMap: Readonly<Record<string, string>> = {
  'destination.ip': 'destination.ip',
  'destination.port': 'destination.port',
  'destination.domain': 'destination.domain',
};

export const networkFieldsMap: Readonly<Record<string, string>> = {
  'network.bytes': 'network.bytes',
  'network.packets': 'network.packets',
};

export const geoFieldsMap: Readonly<Record<string, string>> = {
  'geo.region_name': 'destination.geo.region_name',
  'geo.country_iso_code': 'destination.geo.country_iso_code',
};

export const eventBaseFieldsMap: Readonly<Record<string, string>> = {
  'event.action': 'event.action',
  'event.category': 'event.category',
  'event.duration': 'event.duration',
  // NOTE: This is only for the index filebeat. If you're using auditbeat, then this needs to be changed out for 'event.id': 'event.id'
  'event.id': 'suricata.eve.flow_id',
  'event.module': 'event.module',
  'event.severity': 'event.severity',
  'event.type': 'event.type',
};

export const eventFieldsMap: Readonly<Record<string, string>> = {
  timestamp: '@timestamp',
  ...{ ...destinationFieldsMap },
  ...{ ...eventBaseFieldsMap },
  ...{ ...geoFieldsMap },
  ...{ ...hostFieldsMap },
  ...{ ...networkFieldsMap },
  ...{ ...sourceFieldsMap },
  ...{ ...suricataFieldsMap },
};
