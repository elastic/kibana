/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const ProcessorKeys = t.union([
  t.literal('add_cloud_metadata'),
  t.literal('add_cloudfoundry_metadata'),
  t.literal('add_docker_metadata'),
  t.literal('add_fields'),
  t.literal('add_host_metadata'),
  t.literal('add_id'),
  t.literal('add_kubernetes_metadata'),
  t.literal('add_labels'),
  t.literal('add_locale'),
  t.literal('add_nomad_metadata'),
  t.literal('add_observer_metadata'),
  t.literal('add_process_metadata'),
  t.literal('add_tags'),
  t.literal('append'),
  t.literal('community_id'),
  t.literal('convert'),
  t.literal('copy_fields'),
  t.literal('decode_base64_field'),
  t.literal('decode_duration'),
  t.literal('decode_json_fields'),
  t.literal('decode_xml'),
  t.literal('decode_xml_wineventlog'),
  t.literal('decompress_gzip_field'),
  t.literal('detect_mime_type'),
  t.literal('dissect'),
  t.literal('dns'),
  t.literal('drop_event'),
  t.literal('drop_fields'),
  t.literal('extract_array'),
  t.literal('fingerprint'),
  t.literal('include_fields'),
  t.literal('move-fields'),
  t.literal('rate_limit'),
  t.literal('registered_domain'),
  t.literal('rename'),
  t.literal('replace'),
  t.literal('script'),
  t.literal('syslog'),
  t.literal('translate_sid'),
  t.literal('truncate_fields'),
  t.literal('urldecode'),
]);

export const ProcessorObjectCoded = t.record(ProcessorKeys, t.unknown);
export const ProcessorObjectArrayCoded = t.array(ProcessorObjectCoded);

export type ProcessorObject = t.TypeOf<typeof ProcessorObjectCoded>;
