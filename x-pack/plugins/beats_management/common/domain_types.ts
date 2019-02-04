/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { configBlockSchemas } from './config_schemas';

export const OutputTypesArray = ['elasticsearch', 'logstash', 'kafka', 'redis'];

// Here we create the runtime check for a generic, unknown beat config type.
// We can also pass in optional params to create spacific runtime checks that
// can be used to validate blocs on the API and UI
export const createConfigurationBlockInterface = (
  configType: t.LiteralType<string> | t.UnionType<Array<t.LiteralType<string>>> = t.union(
    configBlockSchemas.map(s => t.literal(s.id))
  ),
  beatConfigInterface: t.Mixed = t.Dictionary
) =>
  t.interface(
    {
      id: t.union([t.undefined, t.string]),
      type: configType,
      description: t.union([t.undefined, t.string]),
      tag: t.string,
      config: beatConfigInterface,
      last_updated: t.union([t.undefined, t.number]),
    },
    'ConfigBlock'
  );
const BaseConfigurationBlock = createConfigurationBlockInterface();
export interface ConfigurationBlock
  extends Pick<
    t.TypeOf<typeof BaseConfigurationBlock>,
    Exclude<keyof t.TypeOf<typeof BaseConfigurationBlock>, 'id'>
  > {
  id: string;
}

export interface CMBeat {
  id: string;
  config_status: 'OK' | 'UNKNOWN' | 'ERROR';
  enrollment_token: string;
  active: boolean;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  last_checkin?: Date;
  event_rate?: string;
  local_configuration_yml?: string;
  tags: string[];
  central_configuration_yml?: string;
  metadata?: {};
  name?: string;
  last_updated: number;
}

export interface ConfigBlockSchema {
  id: string;
  name: string;
  version: number;
  allowOtherConfigs?: boolean;
  configs: BeatConfigSchema[];
}

export interface BeatConfigSchema {
  id: string;
  ui: {
    label: string;
    labelId?: string;
    type: 'input' | 'multi-input' | 'select' | 'code' | 'password';
    helpText?: string;
    helpTextId?: string;
    placeholder?: string;
  };
  options?: Array<{ value: string; text: string }>;
  validation?: 'isHosts' | 'isString' | 'isPeriod' | 'isPath' | 'isPaths' | 'isYaml';
  error: string;
  errorId: string;
  defaultValue?: string;
  required?: boolean;
  parseValidResult?: (value: any) => any;
}

export const RuntimeBeatTag = t.interface(
  {
    id: t.union([t.undefined, t.string]),
    name: t.string,
    color: t.string,
    hasConfigurationBlocksTypes: t.array(t.string),
  },
  'CMBeat'
);
export interface BeatTag
  extends Pick<
    t.TypeOf<typeof RuntimeBeatTag>,
    Exclude<keyof t.TypeOf<typeof RuntimeBeatTag>, 'id'>
  > {
  id: string;
  // Used by the UI and api when a tag exists but is an invalid option
  disabled?: boolean;
}
