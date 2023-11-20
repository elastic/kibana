/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { EcsBase, EcsEvent, EcsHost, EcsUser, EcsAgent } from '@kbn/ecs';
import type { Inspect, Maybe } from '../../../common';

export interface ManagedUserDetailsStrategyResponse extends IEsSearchResponse {
  users: ManagedUser;
  inspect?: Maybe<Inspect>;
}

export enum ManagedUserDatasetKey {
  ENTRA = 'entityanalytics_entra_id.user',
  OKTA = 'entityanalytics_okta.user',
}

export type ManagedUser = Record<
  ManagedUserDatasetKey,
  EntraManagedUser | OktaManagedUser | undefined
>;

export interface EntraManagedUser extends Pick<EcsBase, '@timestamp'> {
  agent: EcsAgent;
  host: EcsHost;
  event: EcsEvent;
  user: EcsUser & {
    last_name?: string;
    first_name?: string;
    phone?: string;
    job_title?: string;
    work?: {
      location_name?: string;
    };
  };
}

export interface OktaManagedUser extends Pick<EcsBase, '@timestamp'> {
  agent: EcsAgent;
  event: EcsEvent;
  user: EcsUser & {
    profile: {
      last_name?: string;
      first_name?: string;
      mobile_phone?: string;
      primaryPhone?: string;
      job_title?: string;
    };
    geo?: {
      city_name?: string;
      country_iso_code?: string;
    };
  };
}
