/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SUB_ACTION } from './constants';

// Connector schema
export const CrowdstrikeConfigSchema = schema.object({});
export const CrowdstrikeSecretsSchema = schema.object({
  clientId: schema.string(),
  clientSecret: schema.string(),
});

// TODO TC: Response Schemas - most is commented out, because we are not able to test it against a real endpoint just yet.
export const CrowdstrikeBaseApiResponseSchema = schema.object(
  {
    resources: schema.arrayOf(schema.any()),
    // errors: schema.nullable(schema.arrayOf(schema.any())),
    // meta: schema.object({
    //   query_time: schema.number(),
    //   powered_by: schema.string(),
    //   trace_id: schema.string(),
    // }),
  },
  { unknowns: 'allow' }
);

export const CrowdstrikeGetAgentsResponseSchema = schema.object(
  {
    resources: schema.arrayOf(
      schema.arrayOf(
        schema.object(
          {
            //   device_id: schema.string(),
            //   cid: schema.string(),
            //   agent_load_flags: schema.string(),
            //   agent_local_time: schema.string(),
            //   agent_version: schema.string(),
            //   bios_manufacturer: schema.string(),
            //   bios_version: schema.string(),
            //   config_id_base: schema.string(),
            //   config_id_build: schema.string(),
            //   config_id_platform: schema.string(),
            //   cpu_signature: schema.string(),
            //   cpu_vendor: schema.string(),
            //   external_ip: schema.string(),
            //   mac_address: schema.string(),
            //   instance_id: schema.string(),
            //   service_provider: schema.string(),
            //   service_provider_account_id: schema.string(),
            //   hostname: schema.string(),
            //   first_seen: schema.string(),
            //   last_login_timestamp: schema.string(),
            //   last_login_user: schema.string(),
            //   last_login_uid: schema.string(),
            //   last_seen: schema.string(),
            //   local_ip: schema.string(),
            //   major_version: schema.string(),
            //   minor_version: schema.string(),
            //   os_version: schema.string(),
            //   platform_id: schema.string(),
            //   platform_name: schema.string(),
            //   policies: schema.arrayOf(
            //     schema.object({
            //       policy_type: schema.string(),
            //       policy_id: schema.string(),
            //       applied: schema.boolean(),
            //       settings_hash: schema.string(),
            //       assigned_date: schema.string(),
            //       applied_date: schema.string(),
            //       rule_groups: schema.any(),
            //     })
            //   ),
            //   reduced_functionality_mode: schema.string(),
            //   device_policies: schema.object({
            //     prevention: schema.object({
            //       policy_type: schema.string(),
            //       policy_id: schema.string(),
            //       applied: schema.boolean(),
            //       settings_hash: schema.string(),
            //       assigned_date: schema.string(),
            //       applied_date: schema.string(),
            //       rule_groups: schema.any(),
            //     }),
            //     sensor_update: schema.object({
            //       policy_type: schema.string(),
            //       policy_id: schema.string(),
            //       applied: schema.boolean(),
            //       settings_hash: schema.string(),
            //       assigned_date: schema.string(),
            //       applied_date: schema.string(),
            //       uninstall_protection: schema.string(),
            //     }),
            //     global_config: schema.object({
            //       policy_type: schema.string(),
            //       policy_id: schema.string(),
            //       applied: schema.boolean(),
            //       settings_hash: schema.string(),
            //       assigned_date: schema.string(),
            //       applied_date: schema.string(),
            //     }),
            //     remote_response: schema.object({
            //       policy_type: schema.string(),
            //       policy_id: schema.string(),
            //       applied: schema.boolean(),
            //       settings_hash: schema.string(),
            //       assigned_date: schema.string(),
            //       applied_date: schema.string(),
            //     }),
            //   }),
            //   groups: schema.arrayOf(schema.any()),
            //   group_hash: schema.string(),
            //   product_type_desc: schema.string(),
            //   provision_status: schema.string(),
            //   serial_number: schema.string(),
            //   status: schema.string(),
            //   system_manufacturer: schema.string(),
            //   system_product_name: schema.string(),
            //   tags: schema.arrayOf(schema.any()),
            //   modified_timestamp: schema.any(),
            //   meta: schema.object({
            //     version: schema.string(),
            //     version_string: schema.string(),
            //   }),
            //   zone_group: schema.string(),
            //   kernel_version: schema.string(),
            //   chassis_type: schema.string(),
            //   chassis_type_desc: schema.string(),
            //   connection_ip: schema.string(),
            //   default_gateway_ip: schema.string(),
            //   connection_mac_address: schema.string(),
            //   linux_sensor_mode: schema.string(),
            //   deployment_type: schema.string(),
          },
          { unknowns: 'allow' }
        )
      )
    ),
    // errors: schema.nullable(schema.arrayOf(schema.any())),
    // meta: schema.object({
    //   query_time: schema.number(),
    //   powered_by: schema.string(),
    //   trace_id: schema.string(),
    // }),
  },
  { unknowns: 'allow' }
);
export const CrowdstrikeHostActionsResponseSchema = schema.object(
  {
    resources: schema.arrayOf(
      schema.object({
        id: schema.string(),
        path: schema.string(),
      })
    ),
    // meta: schema.object({
    //   query_time: schema.number(),
    //   powered_by: schema.string(),
    //   trace_id: schema.string(),
    // }),
    // errors: schema.nullable(schema.arrayOf(schema.any())),
  },
  { unknowns: 'allow' }
);

export const CrowdstrikeHostActionsParamsSchema = schema.object({
  command: schema.oneOf([schema.literal('contain'), schema.literal('lift_containment')]),
  actionParameters: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  ids: schema.arrayOf(schema.string()),
  alertIds: schema.maybe(schema.arrayOf(schema.string())),
});

export const CrowdstrikeGetAgentsParamsSchema = schema.object({
  ids: schema.arrayOf(schema.string()),
});
export const CrowdstrikeGetTokenResponseSchema = schema.object(
  {
    access_token: schema.string(),
    expires_in: schema.number(),
    token_type: schema.string(),
    // fields also existing according to the docs
    // id_token: schema.string(),
    // issued_token_type: schema.string(),
    // refresh_token: schema.string(),
    // scope: schema.string(),
  },
  { unknowns: 'allow' }
);

export const CrowdstrikeHostActionsSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.HOST_ACTIONS),
  subActionParams: CrowdstrikeHostActionsParamsSchema,
});

export const CrowdstrikeActionParamsSchema = schema.oneOf([CrowdstrikeHostActionsSchema]);
