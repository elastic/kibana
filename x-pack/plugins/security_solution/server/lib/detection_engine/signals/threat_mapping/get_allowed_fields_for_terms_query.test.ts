/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndicesGetFieldMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

import {
  getAllowedFieldForTermQueryFromMapping,
  getAllowedFieldsForTermQuery,
} from './get_allowed_fields_for_terms_query';

const indexMapping = {
  'source-index': {
    mappings: {
      'host.name': {
        full_name: 'host.name',
        mapping: {
          name: {
            type: 'keyword',
          },
        },
      },
      'url.full': {
        full_name: 'url.full',
        mapping: {
          full: {
            type: 'keyword',
          },
        },
      },
      'source.range': {
        full_name: 'source.range',
        mapping: {
          range: {
            type: 'ip_range',
          },
        },
      },
    },
  },
  'other-source-index': {
    mappings: {
      'host.name': {
        full_name: 'host.name',
        mapping: {
          name: {
            type: 'keyword',
          },
        },
      },
      'host.ip': {
        full_name: 'host.ip',
        mapping: {
          name: {
            type: 'ip',
          },
        },
      },
    },
  },
};

describe('get_allowed_fields_for_terms_query copy', () => {
  describe('getAllowedFieldForTermQueryFromMapping', () => {
    it('should return map of fields allowed for term query', () => {
      const result = getAllowedFieldForTermQueryFromMapping(
        indexMapping as IndicesGetFieldMappingResponse
      );
      expect(result).toEqual({
        'host.ip': true,
        'url.full': true,
        'host.name': true,
      });
    });
    it('should disable fields if in one index type not supported', () => {
      const result = getAllowedFieldForTermQueryFromMapping({
        ...indexMapping,
        'new-source-index': {
          mappings: {
            'host.name': {
              full_name: 'host.name',
              mapping: {
                name: {
                  type: 'text',
                },
              },
            },
          },
        },
      } as IndicesGetFieldMappingResponse);
      expect(result).toEqual({
        'host.ip': true,
        'url.full': true,
      });
    });
  });

  describe('getlAllowedFieldsForTermQuery', () => {
    let alertServices: RuleExecutorServicesMock;
    let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;

    beforeEach(() => {
      alertServices = alertsMock.createRuleExecutorServices();
      alertServices.scopedClusterClient.asCurrentUser.indices.getFieldMapping.mockResolvedValue(
        indexMapping as IndicesGetFieldMappingResponse
      );
      ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    });

    it('should return map of fields allowed for term query for source and threat indices', async () => {
      const threatMatchedFields = {
        source: ['host.name', 'url.full'],
        threat: ['host.name', 'url.full'],
      };
      const threatIndex = ['threat-index'];
      const inputIndex = ['source-index'];

      const result = await getAllowedFieldsForTermQuery({
        threatMatchedFields,
        services: alertServices,
        threatIndex,
        inputIndex,
        ruleExecutionLogger,
      });
      expect(result).toEqual({
        source: {
          'host.ip': true,
          'url.full': true,
          'host.name': true,
        },
        threat: {
          'host.ip': true,
          'url.full': true,
          'host.name': true,
        },
      });
    });
  });
});
