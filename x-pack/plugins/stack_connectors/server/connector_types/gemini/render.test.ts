/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderParameterTemplates } from './render';
import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { SUB_ACTION } from '../../../common/gemini/constants';
import { Logger } from '@kbn/logging';
import { renderMustacheObject } from '@kbn/actions-plugin/server/lib/mustache_renderer';

// Mock the renderMustacheString function
jest.mock('@kbn/actions-plugin/server/lib/mustache_renderer', () => ({
  renderMustacheString: jest.fn((variables)
  ),
}));

const mockLogger: Logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  isLevelEnabled: jest.fn().mockReturnValue(true), // Enable all levels by default
  get: jest.fn((...childContextPaths: string[]) => mockLogger), // Return the same mock for child loggers
};

describe('Gemini - renderParameterTemplates', () => {
  const variables = { someVar: 'someValue' }; // Sample variables for rendering

  it('should return params unchanged for non-RUN/TEST subActions', () => {
    const params: ExecutorParams = {
      subAction: 'some_other_action',
      subActionParams: {},
    };

    const result = renderParameterTemplates(mockLogger, params, variables);
    expect(result).toEqual(params); // No changes expected
  });

  it('should render Mustache templates in body for RUN and TEST subActions', () => {
    const runParams: ExecutorParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: '{"message": "Hello, {{someVar}}!"}',
      },
    };

    const testParams: ExecutorParams = {
      subAction: SUB_ACTION.TEST,
      subActionParams: {
        body: '{"test": "{{someVar}} works!"}',
      },
    };

    const runResult = renderParameterTemplates(mockLogger, runParams, variables);
    expect(runResult.subActionParams.body).toEqual(
      JSON.stringify({ message: 'Hello, !' })
    );

    const testResult = renderParameterTemplates(mockLogger, testParams, variables);
    expect(testResult.subActionParams.body).toEqual(JSON.stringify({ test: 'someValue works!' }));
  });

  it('should handle missing or invalid subActionParams gracefully', () => {
    const paramsWithNoSubActionParams: ExecutorParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: '123',
      },
    };
    const paramsWithNonStringBody: ExecutorParams = {
      subAction: SUB_ACTION.TEST,
      subActionParams: {
        body: true, // Invalid body
      },
    };

    expect(renderParameterTemplates(mockLogger, paramsWithNoSubActionParams, variables)).toEqual(
      paramsWithNoSubActionParams
    );
    expect(renderParameterTemplates(mockLogger, paramsWithNonStringBody, variables)).toEqual(
      paramsWithNonStringBody
    );

    expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Should log a debug message for invalid body
  });
});
function variables(this: any, ...args: any[]): unknown {
  throw new Error('Function not implemented.');
}

