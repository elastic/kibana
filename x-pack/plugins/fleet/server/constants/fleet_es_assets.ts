/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESAssetMetadata } from '../services/epm/elasticsearch/meta';

const meta = getESAssetMetadata();

export const PACKAGE_TEMPLATE_SUFFIX = '@package';

export const USER_SETTINGS_TEMPLATE_SUFFIX = '@custom';

export const FLEET_FINAL_PIPELINE_ID = '.fleet_final_pipeline-1';

export const FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME = '.fleet_globals-1';

export const FLEET_GLOBALS_COMPONENT_TEMPLATE_CONTENT = {
  _meta: meta,
  template: {
    settings: {},
    mappings: {
      _meta: meta,
      // All the dynamic field mappings
      dynamic_templates: [
        // This makes sure all mappings are keywords by default
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
            match_mapping_type: 'string',
          },
        },
      ],
      // As we define fields ahead, we don't need any automatic field detection
      // This makes sure all the fields are mapped to keyword by default to prevent mapping conflicts
      date_detection: false,
    },
  },
};
export const FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME = '.fleet_agent_id_verification-1';

export const FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_CONTENT = {
  _meta: meta,
  template: {
    settings: {
      index: {
        final_pipeline: FLEET_FINAL_PIPELINE_ID,
      },
    },
    mappings: {
      properties: {
        event: {
          properties: {
            ingested: {
              type: 'date',
              format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            },
            agent_id_status: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      },
    },
  },
};

export const FLEET_COMPONENT_TEMPLATES = [
  { name: FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME, body: FLEET_GLOBALS_COMPONENT_TEMPLATE_CONTENT },
  {
    name: FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME,
    body: FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_CONTENT,
  },
];

export const FLEET_FINAL_PIPELINE_VERSION = 2;

// If the content is updated you probably need to update the FLEET_FINAL_PIPELINE_VERSION too to allow upgrade of the pipeline
export const FLEET_FINAL_PIPELINE_CONTENT = `---
version: ${FLEET_FINAL_PIPELINE_VERSION}
_meta:
  managed_by: ${meta.managed_by}
  managed: ${meta.managed}
description: >
  Final pipeline for processing all incoming Fleet Agent documents.
processors:
  - set:
      description: Add time when event was ingested.
      field: event.ingested
      copy_from: _ingest.timestamp
  - script:
      description: Remove sub-seconds from event.ingested to improve storage efficiency.
      tag: truncate-subseconds-event-ingested
      source: ctx.event.ingested = ctx.event.ingested.withNano(0).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      ignore_failure: true
  - remove:
      description: Remove any pre-existing untrusted values.
      field:
        - event.agent_id_status
        - _security
      ignore_missing: true
  - set_security_user:
      field: _security
      properties:
        - authentication_type
        - username
        - realm
        - api_key
  - script:
      description: >
        Add event.agent_id_status based on the API key metadata and the
        agent.id contained in the event.
      tag: agent-id-status
      source: |-
        boolean is_user_trusted(def ctx, def users) {
          if (ctx?._security?.username == null) {
            return false;
          }

          def user = null;
          for (def item : users) {
            if (item?.username == ctx._security.username) {
              user = item;
              break;
            }
          }

          if (user == null || user?.realm == null || ctx?._security?.realm?.name == null) {
            return false;
          }

          if (ctx._security.realm.name != user.realm) {
            return false;
          }

          return true;
        }

        String verified(def ctx, def params) {
          // No agent.id field to validate.
          if (ctx?.agent?.id == null) {
            return "missing";
          }

          // Check auth metadata from API key.
          if (ctx?._security?.authentication_type == null
              // Agents only use API keys.
              || ctx._security.authentication_type != 'API_KEY'
              // Verify the API key owner before trusting any metadata it contains.
              || !is_user_trusted(ctx, params.trusted_users)
              // Verify the API key has metadata indicating the assigned agent ID.
              || ctx?._security?.api_key?.metadata?.agent_id == null) {
            return "auth_metadata_missing";
          }

          // The API key can only be used represent the agent.id it was issued to.
          if (ctx._security.api_key.metadata.agent_id != ctx.agent.id) {
            // Potential masquerade attempt.
            return "mismatch";
          }

          return "verified";
        }

        if (ctx?.event == null) {
          ctx.event = [:];
        }

        ctx.event.agent_id_status = verified(ctx, params);
      params:
        # List of users responsible for creating Fleet output API keys.
        trusted_users:
          - username: elastic/fleet-server
            realm: _service_account
          - username: cloud-internal-agent-server
            realm: found
          - username: elastic
            realm: reserved
  - remove:
      field: _security
      ignore_missing: true
on_failure:
  - remove:
      field: _security
      ignore_missing: true
      ignore_failure: true
  - append:
      field: error.message
      value:
        - 'failed in Fleet agent final_pipeline: {{ _ingest.on_failure_message }}'`;
