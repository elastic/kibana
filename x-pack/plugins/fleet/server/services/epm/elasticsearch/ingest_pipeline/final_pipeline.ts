/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINAL_PIPELINE_ID = '.fleet_final_pipeline';

export const FINAL_PIPELINE = `---
description: >
  Final pipeline for processing all incoming Fleet Agent documents.
processors:
  - set:
      description: Add time when event was ingested.
      field: event.ingested
      value: '{{{_ingest.timestamp}}}'
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
