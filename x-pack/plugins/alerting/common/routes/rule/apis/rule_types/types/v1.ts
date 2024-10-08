/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ActionVariable {
  name: string;
  description: string;
  usesPublicBaseUrl?: boolean;
}

interface ActionGroup {
  id: string;
  name: string;
}

export type TypesRulesResponseBody = Array<{
  action_groups: ActionGroup[];
  action_variables: {
    context: ActionVariable[];
    state: ActionVariable[];
    params: ActionVariable[];
  };
  alerts: {
    context: string;
    mappings: {
      dynamic?: boolean;
      fieldMap: Record<
        string,
        {
          array?: boolean;
          dynamic?: boolean;
          format?: string;
          ignore_above?: number;
          index?: boolean;
          path?: string;
          properties?: Record<string, unknown>;
          required?: boolean;
          scaling_factor?: number;
          type?: string;
        }
      >;
    };
    shouldWrite?: boolean;
    useEcs?: boolean;
  };
  authorized_consumers: Record<string, { read: boolean; all: boolean }>;
  category: string;
  default_action_group_id: string;
  does_set_recovery_context: boolean;
  enabled_in_license: boolean;
  fields_for_a_a_d: string[];
  has_alerts_mappings: boolean;
  has_fields_for_a_a_d: boolean;
  id: string;
  is_exportable: boolean;
  minimum_license_required: 'basic' | 'gold' | 'platinum';
  name: string;
  producer: string;
  recovery_action_group: ActionGroup;
  rule_task_timeout: string;
}>;

export interface TypesRulesResponse {
  body: TypesRulesResponseBody;
}
