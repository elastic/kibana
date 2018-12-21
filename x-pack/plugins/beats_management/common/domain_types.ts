/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { RuntimeTagDoc } from '../server/lib/adapters/tags/adapter_types';
import { InterfaceExcept } from '../server/utils/helper_types';
import { configBlockSchemas } from './config_schemas';

export const OutputTypesArray = ['elasticsearch', 'logstash', 'kafka', 'redis'];

// Here we create the runtime check for a genaric, unknown beat config type.
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
      type: configType,
      description: t.union([t.undefined, t.string]),
      config: beatConfigInterface,
    },
    'ConfigBlock'
  );
const BaseConfigurationBlock = createConfigurationBlockInterface();
export interface ConfigurationBlock extends t.TypeOf<typeof BaseConfigurationBlock> {
  id?: string;
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
  tags?: string[];
  central_configuration_yml?: string;
  metadata?: {};
  name?: string;
}

export interface CMPopulatedBeat extends CMBeat {
  full_tags: BeatTag[];
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

export interface BeatTag
  extends InterfaceExcept<
    t.TypeOf<typeof RuntimeTagDoc>,
    'configuration_block_ids' | 'last_updated'
  > {
  last_updated: Date;
  configuration_blocks: ConfigurationBlock[];
}
