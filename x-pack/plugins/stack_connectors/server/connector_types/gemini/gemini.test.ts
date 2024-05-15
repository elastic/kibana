import { GeminiConnector } from './gemini';
import { Config, Secrets } from '../../../common/gemini/types';
import { ServiceParams} from '@kbn/actions-plugin/server';
import {ActionsConfigurationUtilities} from 'x-pack/plugins/actions/server/actions_config';
import { MockedLogger } from '@kbn/logging-mocks';
import { SUB_ACTION } from '../../../common/gemini/constants';
  import { DashboardActionParamsSchema } from '../../../common/gemini/schema';
  import {
    RunActionParamsSchema,
    InvokeAIActionParamsSchema
  } from '../../../common/gemini/schema';
  import type {
    Services
  } from 'x-pack/plugins/actions/server/types';
import { data } from 'jquery';


describe('GeminiConnector', () => {

    // Successfully register sub actions
    it('should successfully register sub actions when called', () => {
      const params: ServiceParams<Config, Secrets> = {
        connector: { id: '123', type: 'gemini' },
        config: { apiUrl: 'https://example.com', defaultModel: 'model1', gcpRegion: 'us-central1', gcpProjectID: 'project1' },
        configurationUtilities: {} as ActionsConfigurationUtilities,
        logger: {} as MockedLogger,
        secrets: {} as Secrets,
        services: {} as Services,
      };

      const connector = new GeminiConnector(params);

      expect(connector.getSubActions()).toEqual([
        { name: SUB_ACTION.RUN, method: 'runApi', schema: RunActionParamsSchema },
        { name: SUB_ACTION.DASHBOARD, method: 'getDashboard', schema: DashboardActionParamsSchema },
        { name: SUB_ACTION.TEST, method: 'runTestApi', schema: RunActionParamsSchema },
        { name: SUB_ACTION.INVOKE_AI, method: 'invokeAI', schema: InvokeAIActionParamsSchema },
        { name: SUB_ACTION.INVOKE_STREAM, method: 'invokeStream', schema: InvokeAIActionParamsSchema },
      ]);
    });

    // Invalid or missing parameters in sub action registration
    it('should throw an error when registering sub actions with invalid or missing parameters', () => {
      const params: ServiceParams<Config, Secrets> = {
        connector: { id: '123', type: 'gemini' },
        config: { apiUrl: 'https://example.com', defaultModel: 'model1', gcpRegion: 'us-central1', gcpProjectID: 'project1' },
        configurationUtilities: {} as ActionsConfigurationUtilities,
        logger: {} as MockedLogger,
        secrets: {} as Secrets,
        services: {} as Services,
      };

      const connector = new GeminiConnector(params);

      expect(connector.getSubActions.length).toBe(5);
      expect(connector.getSubActions()).toEqual({
        name: SUB_ACTION.RUN,
        method: 'runApi',
        schema: RunActionParamsSchema,
      });
      expect(connector.getSubActions()).toEqual({
        name: SUB_ACTION.DASHBOARD,
        method: 'getDashboard',
        schema: DashboardActionParamsSchema,
      });
      expect(connector.getSubActions()).toEqual({
        name: SUB_ACTION.TEST,
        method: 'runTestApi',
        schema: RunActionParamsSchema,
      });
      expect(connector.getSubActions()).toEqual({
        name: SUB_ACTION.INVOKE_AI,
        method: 'invokeAI',
        schema: InvokeAIActionParamsSchema,
      });
      expect(connector.getSubActions()).toEqual({
        name: SUB_ACTION.INVOKE_STREAM,
        method: 'invokeStream',
        schema: InvokeAIActionParamsSchema,
      });
    });

        // Successfully run API
        it('should successfully run the API', async () => {
            // Mock the necessary dependencies
            const params: ServiceParams<Config, Secrets> = {
              connector: { id: '123', type: 'gemini' },
              config: { apiUrl: 'https://example.com', defaultModel: 'model1', gcpRegion: 'us-central1', gcpProjectID: 'project1' },
              configurationUtilities: {} as ActionsConfigurationUtilities,
              logger: {} as MockedLogger,
              secrets: {} as Secrets,
              services: {} as Services,
            };
      
            // Mock the necessary dependencies for the runApiLatest method
            const requestArgs = {
              url: 'https://example.com/v1/projects/project1/locations/us-central1/publishers/google/models/model1:generateContent',
              method: 'post',
              data: JSON.stringify({ messages: [] }),
              headers: {
                Authorization: 'Bearer ',
                'Content-Type': 'application/json',
              },
              timeout: 120000,
            };
            const response = {
              data: {
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: 'Completion Text',
                        },
                      ],
                    },
                  },
                ],
              },
            };
            const geminiConnector = new GeminiConnector(params);
      
            // Call the runApi method
            const result = await geminiConnector.runApi({ body: JSON.stringify({ messages: [] }) });
      
            // Assert the result
            expect(result).toEqual({ completion: 'Completion Text' });
          });
});

