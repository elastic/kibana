/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ICMPSimpleFields
import * as t from 'io-ts';
import { CommonFieldsCodec } from './common_ields';
import { ConfigKey } from './config_key';
import { DataStream } from './monitor_configs';

export const ICMPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.HOSTS]: t.string,
    [ConfigKey.WAIT]: t.string,
  }),
  CommonFieldsCodec,
  t.interface({
    [ConfigKey.MONITOR_TYPE]: t.literal(DataStream.ICMP),
  }),
]);

export type ICMPSimpleFields = t.TypeOf<typeof ICMPSimpleFieldsCodec>;
export type ICMPFields = t.TypeOf<typeof ICMPSimpleFieldsCodec>;
