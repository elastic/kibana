/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ClientSideBeatTag } from '../public/lib/lib';
import { ConfigurationBlockTypes } from './constants';

export interface ConfigurationBlock {
  type: ConfigurationBlockTypes;
  description: string;
  block_yml: string;
}

export interface CMBeat {
  id: string;
  enrollment_token: string;
  active: boolean;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  last_updated?: string;
  event_rate?: string;
  local_configuration_yml?: string;
  tags?: string[];
  central_configuration_yml?: string;
  metadata?: {};
}

export interface CMPopulatedBeat extends CMBeat {
  full_tags: ClientSideBeatTag[];
}

export interface BeatTag {
  id: string;
  configuration_blocks: ConfigurationBlock[];
  color?: string;
  last_updated: Date;
}
