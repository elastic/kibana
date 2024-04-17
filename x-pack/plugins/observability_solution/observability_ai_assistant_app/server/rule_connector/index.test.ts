/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertHit } from '@kbn/alerting-plugin/server/types';
import { ObservabilityAIAssistantRouteHandlerResources } from '@kbn/observability-ai-assistant-plugin/server/routes/types';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import {
  getObsAIAssistantConnectorAdapter,
  getObsAIAssistantConnectorType,
  ObsAIAssistantConnectorTypeExecutorOptions,
} from '.';

describe('observabilityAIAssistant rule_connector', () => {
  describe('getObsAIAssistantConnectorAdapter', () => {
    it('uses correct connector_id', () => {
      const adapter = getObsAIAssistantConnectorAdapter();
      expect(adapter.connectorTypeId).toEqual(OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID);
    });

    it('builds action params', () => {
      const adapter = getObsAIAssistantConnectorAdapter();
      const params = adapter.buildActionParams({
        params: { connector: '.azure', message: 'hello' },
        rule: { id: 'foo', name: 'bar', tags: [], consumer: '', producer: '' },
        ruleUrl: 'http://myrule.com',
        spaceId: 'default',
        alerts: {
          all: { count: 1, data: [] },
          new: { count: 1, data: [{ _id: 'new_alert' } as AlertHit] },
          ongoing: { count: 1, data: [] },
          recovered: { count: 1, data: [{ _id: 'recovered_alert' } as AlertHit] },
        },
      });

      expect(params).toEqual({
        connector: '.azure',
        message: 'hello',
        rule: { id: 'foo', name: 'bar', tags: [], ruleUrl: 'http://myrule.com' },
        alerts: {
          new: [{ _id: 'new_alert' }],
          recovered: [{ _id: 'recovered_alert' }],
        },
      });
    });
  });

  describe('getObsAIAssistantConnectorType', () => {
    it('is correctly configured', () => {
      const initResources = jest
        .fn()
        .mockResolvedValue({} as ObservabilityAIAssistantRouteHandlerResources);
      const connectorType = getObsAIAssistantConnectorType(initResources);
      expect(connectorType.id).toEqual(OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID);
      expect(connectorType.isSystemActionType).toEqual(true);
      expect(connectorType.minimumLicenseRequired).toEqual('enterprise');
    });

    it('does not execute when no new or recovered alerts', async () => {
      const initResources = jest
        .fn()
        .mockResolvedValue({} as ObservabilityAIAssistantRouteHandlerResources);
      const connectorType = getObsAIAssistantConnectorType(initResources);
      const result = await connectorType.executor({
        actionId: 'observability-ai-assistant',
        request: getFakeKibanaRequest({ id: 'foo', api_key: 'bar' }),
        params: { alerts: { new: [], recovered: [] } },
      } as unknown as ObsAIAssistantConnectorTypeExecutorOptions);
      expect(result).toEqual({ actionId: 'observability-ai-assistant', status: 'ok' });
      expect(initResources).not.toHaveBeenCalled();
    });
  });
});
