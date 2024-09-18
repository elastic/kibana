/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { EsAttackDiscoverySchema } from '../ai_assistant_data_clients/attack_discovery/types';

export const getAttackDiscoverySearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsAttackDiscoverySchema> = {
    took: 3,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: 'foo',
          _id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          _source: {
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            '@timestamp': '2024-06-07T18:56:17.357Z',
            created_at: '2024-06-07T18:56:17.357Z',
            users: [
              {
                id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                name: 'elastic',
              },
            ],
            status: 'succeeded',
            api_config: {
              action_type_id: '.gen-ai',
              connector_id: 'my-gpt4o-ai',
            },
            attack_discoveries: [
              {
                summary_markdown:
                  'Critical malware detected on {{ host.name cd854ec0-1096-4ca6-a7b8-582655d6b970 }} involving {{ user.name f19e1a0a-de3b-496c-8ace-dd91229e1084 }}. The malware, identified as {{ file.name My Go Application.app }}, was executed with the command line {{ process.command_line xpcproxy application.Appify by Machine Box.My Go Application.20.23 }}.',
                id: 'a45bc1af-e652-4f3b-b8ce-408028f29824',
                title: 'Critical Malware Detection',
                mitre_attack_tactics: ['Execution', 'Persistence', 'Privilege Escalation'],
                alert_ids: [
                  '094e59adc680420aeb1e0f872b52e17bd2f61aaddde521d53600f0576062ac4d',
                  'fdcb45018d3aac5e7a529a455aedc9276ef89b386ca4dbae1d721dd383577d21',
                  '82baa43f7514ee7fb107ae032606d33afc6092a9c9a9caeffd1fe120a7640698',
                  'aef4302768e19c5413c53203c14624bdf9d0656fa3d1d439c633c9880a2f3f6e',
                  '04cbafe6d7f965908a9155ae0bc559ce537faaf06266df732d7bd6897c83e77e',
                  '6f73d978ea02a471eba8d82772dc16f26622628b93fa0a651ce847fe7baf9e64',
                  '7ff1cd151bfdd2678d9efd4e22bfaf15dbfd89a81f40ea2160769c143ecca082',
                  'dee8604204be00bc61112fe81358089a5e4d494ac28c95937758383f391a8cec',
                  '4c49b1fbcb6f9a4cfb355f56edfbc0d5320cd65f9f720546dd99e51d8d6eef84',
                ],
                details_markdown: `"""- **Host**: {{ host.name cd854ec0-1096-4ca6-a7b8-582655d6b970 }}\n- **User**: {{ user.name f19e1a0a-de3b-496c-8ace-dd91229e1084 }}\n- **Malware**: {{ file.name My Go Application.app }}\n- **Path**: {{ file.path /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/37D933EC-334D-410A-A741-0F730D6AE3FD/d/Setup.app/Contents/MacOS/My Go Application.app }}\n- **Command Line**: {{ process.command_line xpcproxy application.Appify by Machine Box.My Go Application.20.23 }}\n- **SHA256**: {{ process.hash.sha256 2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097 }}\n- **Parent Process**: {{ process.parent.name launchd }}\n- **Parent Command Line**: {{ process.parent.command_line /sbin/launchd }}\n- **Code Signature**: {{ process.code_signature.status code failed to satisfy specified code requirement(s) }}"""`,
                entity_summary_markdown:
                  '{{ host.name cd854ec0-1096-4ca6-a7b8-582655d6b970 }} and {{ user.name f19e1a0a-de3b-496c-8ace-dd91229e1084 }} involved in critical malware detection.',
                timestamp: '2024-06-07T21:19:08.090Z',
              },
            ],
            updated_at: '2024-06-07T21:19:08.090Z',
            last_viewed_at: '2024-06-07T21:19:08.090Z',
            replacements: [
              {
                uuid: 'f19e1a0a-de3b-496c-8ace-dd91229e1084',
                value: 'root',
              },
              {
                uuid: 'cd854ec0-1096-4ca6-a7b8-582655d6b970',
                value: 'SRVMAC08',
              },
              {
                uuid: '3517f073-7f5e-42b4-9c42-e8a25dc9e27e',
                value: 'james',
              },
              {
                uuid: 'f04af949-504e-4374-a31e-447e7d5b252e',
                value: 'Administrator',
              },
              {
                uuid: '7eecfdbb-373a-4cbb-9bf7-e91a0be73b29',
                value: 'SRVWIN07-PRIV',
              },
              {
                uuid: '8b73ea51-4c7a-4caa-a424-5b2495eabd2a',
                value: 'SRVWIN07',
              },
              {
                uuid: '908405b1-fc8b-4fef-9bdf-35895896a1e3',
                value: 'SRVWIN06',
              },
              {
                uuid: '7e8a2687-74d6-47d2-951c-522e21a44853',
                value: 'SRVNIX05',
              },
            ],
            namespace: 'default',
            generation_intervals: [
              {
                date: '2024-06-07T21:19:08.089Z',
                duration_ms: 110906,
              },
              {
                date: '2024-06-07T20:04:35.715Z',
                duration_ms: 104593,
              },
              {
                date: '2024-06-07T18:58:27.880Z',
                duration_ms: 130526,
              },
            ],
            alerts_context_count: 20,
            average_interval_ms: 115341,
          },
        },
      ],
    },
  };
  return searchResponse;
};
