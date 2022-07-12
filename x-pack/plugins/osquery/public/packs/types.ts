/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/public';
import type { PackQueryFormData } from './queries/use_pack_query_form';

export interface IQueryPayload {
  attributes?: {
    name: string;
    id: string;
  };
}

export interface PackItemQuery {
  id: string;
  name: string;
  interval: number;
  query: string;
  platform?: string;
  version?: string;
  ecs_mapping?: Array<
    Record<
      string,
      {
        field?: string;
        value?: string;
      }
    >
  >;
}

export type PackSavedObject = SavedObject<{
  name: string;
  description: string | undefined;
  queries: PackQueryFormData[];
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
}>;

export type PackItem = PackSavedObject['attributes'] & {
  id: string;
  policy_ids: string[];
  read_only?: boolean;
};
