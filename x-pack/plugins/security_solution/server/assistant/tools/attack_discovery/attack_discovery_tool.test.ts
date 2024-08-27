/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttackDiscoveryPostRequestBody } from '@kbn/elastic-assistant-common';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { DynamicTool } from '@langchain/core/tools';

import { loggerMock } from '@kbn/logging-mocks';

import { ATTACK_DISCOVERY_TOOL } from './attack_discovery_tool';
import { mockAnonymizationFields } from '../mock/mock_anonymization_fields';
import { mockEmptyOpenAndAcknowledgedAlertsQueryResults } from '../mock/mock_empty_open_and_acknowledged_alerts_qery_results';
import { mockOpenAndAcknowledgedAlertsQueryResults } from '../mock/mock_open_and_acknowledged_alerts_query_results';

jest.mock('langchain/chains', () => {
  const mockLLMChain = jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue({
      records: [
        {
          alertIds: [
            'b6e883c29b32571aaa667fa13e65bbb4f95172a2b84bdfb85d6f16c72b2d2560',
            '0215a6c5cc9499dd0290cd69a4947efb87d3ddd8b6385a766d122c2475be7367',
            '600eb9eca925f4c5b544b4e9d3cf95d83b7829f8f74c5bd746369cb4c2968b9a',
            'e1f4a4ed70190eb4bd256c813029a6a9101575887cdbfa226ac330fbd3063f0c',
            '2a7a4809ca625dfe22ccd35fbef7a7ba8ed07f109e5cbd17250755cfb0bc615f',
          ],
          detailsMarkdown:
            '- Malicious Go application named "My Go Application.app" is being executed from temporary directories, likely indicating malware delivery\n- The malicious application is spawning child processes like `osascript` to display fake system dialogs and attempt to phish user credentials ({{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }}, {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }})\n- The malicious application is also executing `chmod` to make the file `unix1` executable ({{ file.path /Users/james/unix1 }})\n- `unix1` is a potentially malicious executable that is being run with suspicious arguments related to the macOS keychain ({{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db TempTemp1234!! }})\n- Multiple detections indicate the presence of malware on the host attempting credential access and execution of malicious payloads',
          entitySummaryMarkdown:
            'Malicious activity detected on {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} involving user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
          mitreAttackTactics: ['Credential Access', 'Execution'],
          summaryMarkdown:
            'Multiple detections indicate the presence of malware on a macOS host {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} attempting credential theft and execution of malicious payloads targeting the user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
          title: 'Malware Delivering Malicious Payloads on macOS',
        },
      ],
    }),
  }));

  return {
    LLMChain: mockLLMChain,
  };
});

describe('AttackDiscoveryTool', () => {
  const alertsIndexPattern = '.alerts-security.alerts-default';
  const replacements = { uuid: 'original_value' };
  const size = 20;
  const request = {
    body: {
      actionTypeId: '.bedrock',
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      connectorId: 'test-connector-id',
      replacements,
      size,
      subAction: 'invokeAI',
    },
  } as unknown as KibanaRequest<unknown, unknown, AttackDiscoveryPostRequestBody>;

  const esClient = {
    search: jest.fn(),
  } as unknown as ElasticsearchClient;
  const llm = jest.fn() as unknown as ActionsClientLlm;
  const logger = loggerMock.create();

  const rest = {
    anonymizationFields: mockAnonymizationFields,
    isEnabledKnowledgeBase: false,
    llm,
    logger,
    modelExists: false,
    onNewReplacements: jest.fn(),
    size,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (esClient.search as jest.Mock).mockResolvedValue(mockOpenAndAcknowledgedAlertsQueryResults);
  });

  describe('isSupported', () => {
    it('returns false when the request is missing required anonymization parameters', () => {
      const requestMissingAnonymizationParams = {
        body: {
          isEnabledKnowledgeBase: false,
          alertsIndexPattern: '.alerts-security.alerts-default',
          size: 20,
        },
      } as unknown as KibanaRequest<unknown, unknown, AttackDiscoveryPostRequestBody>;

      const params = {
        alertsIndexPattern,
        esClient,
        request: requestMissingAnonymizationParams, // <-- request is missing required anonymization parameters
        ...rest,
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when the alertsIndexPattern is undefined', () => {
      const params = {
        esClient,
        request,
        ...rest,
        alertsIndexPattern: undefined, // <-- alertsIndexPattern is undefined
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when size is undefined', () => {
      const params = {
        alertsIndexPattern,
        esClient,
        request,
        ...rest,
        size: undefined, // <-- size is undefined
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when size is out of range', () => {
      const params = {
        alertsIndexPattern,
        esClient,
        request,
        ...rest,
        size: 0, // <-- size is out of range
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when llm is undefined', () => {
      const params = {
        alertsIndexPattern,
        esClient,
        request,
        ...rest,
        llm: undefined, // <-- llm is undefined
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(false);
    });

    it('returns true if all required params are provided', () => {
      const params = {
        alertsIndexPattern,
        esClient,
        request,
        ...rest,
      };

      expect(ATTACK_DISCOVERY_TOOL.isSupported(params)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns null when llm is undefined', () => {
      const tool = ATTACK_DISCOVERY_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
        llm: undefined, // <-- llm is undefined
      });

      expect(tool).toBeNull();
    });

    it('returns a `DynamicTool` with a `func` that calls `esClient.search()` with the expected alerts query', async () => {
      const tool: DynamicTool = ATTACK_DISCOVERY_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
      }) as DynamicTool;

      await tool.func('');

      expect(esClient.search).toHaveBeenCalledWith({
        allow_no_indices: true,
        body: {
          _source: false,
          fields: mockAnonymizationFields.map(({ field }) => ({
            field,
            include_unmapped: true,
          })),
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          minimum_should_match: 1,
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.workflow_status': 'open',
                              },
                            },
                            {
                              match_phrase: {
                                'kibana.alert.workflow_status': 'acknowledged',
                              },
                            },
                          ],
                        },
                      },
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: 'now-24h',
                            lte: 'now',
                          },
                        },
                      },
                    ],
                    must: [],
                    must_not: [
                      {
                        exists: {
                          field: 'kibana.alert.building_block_type',
                        },
                      },
                    ],
                    should: [],
                  },
                },
              ],
            },
          },
          runtime_mappings: {},
          size,
          sort: [
            {
              'kibana.alert.risk_score': {
                order: 'desc',
              },
            },
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: [alertsIndexPattern],
      });
    });

    it('returns a `DynamicTool` with a `func` returns an empty attack discoveries array when getAnonymizedAlerts returns no alerts', async () => {
      (esClient.search as jest.Mock).mockResolvedValue(
        mockEmptyOpenAndAcknowledgedAlertsQueryResults // <-- no alerts
      );

      const tool: DynamicTool = ATTACK_DISCOVERY_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
      }) as DynamicTool;

      const result = await tool.func('');
      const expected = JSON.stringify({ alertsContextCount: 0, attackDiscoveries: [] }, null, 2); // <-- empty attack discoveries array

      expect(result).toEqual(expected);
    });

    it('returns a `DynamicTool` with a `func` that returns the expected results', async () => {
      const tool: DynamicTool = ATTACK_DISCOVERY_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
      }) as DynamicTool;

      await tool.func('');

      const result = await tool.func('');
      const expected = JSON.stringify(
        {
          alertsContextCount: 20,
          attackDiscoveries: [
            {
              alertIds: [
                'b6e883c29b32571aaa667fa13e65bbb4f95172a2b84bdfb85d6f16c72b2d2560',
                '0215a6c5cc9499dd0290cd69a4947efb87d3ddd8b6385a766d122c2475be7367',
                '600eb9eca925f4c5b544b4e9d3cf95d83b7829f8f74c5bd746369cb4c2968b9a',
                'e1f4a4ed70190eb4bd256c813029a6a9101575887cdbfa226ac330fbd3063f0c',
                '2a7a4809ca625dfe22ccd35fbef7a7ba8ed07f109e5cbd17250755cfb0bc615f',
              ],
              detailsMarkdown:
                '- Malicious Go application named "My Go Application.app" is being executed from temporary directories, likely indicating malware delivery\n- The malicious application is spawning child processes like `osascript` to display fake system dialogs and attempt to phish user credentials ({{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }}, {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }})\n- The malicious application is also executing `chmod` to make the file `unix1` executable ({{ file.path /Users/james/unix1 }})\n- `unix1` is a potentially malicious executable that is being run with suspicious arguments related to the macOS keychain ({{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db TempTemp1234!! }})\n- Multiple detections indicate the presence of malware on the host attempting credential access and execution of malicious payloads',
              entitySummaryMarkdown:
                'Malicious activity detected on {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} involving user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
              mitreAttackTactics: ['Credential Access', 'Execution'],
              summaryMarkdown:
                'Multiple detections indicate the presence of malware on a macOS host {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} attempting credential theft and execution of malicious payloads targeting the user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
              title: 'Malware Delivering Malicious Payloads on macOS',
            },
          ],
        },
        null,
        2
      );

      expect(result).toEqual(expected);
    });

    it('returns a tool instance with the expected tags', () => {
      const tool = ATTACK_DISCOVERY_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['attack-discovery']);
    });
  });
});
