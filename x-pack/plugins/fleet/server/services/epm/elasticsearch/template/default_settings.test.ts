/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from 'src/core/server';

import { appContextService } from '../../../app_context';

import { buildDefaultSettings } from './default_settings';

jest.mock('../../../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
let mockedLogger: jest.Mocked<Logger>;
describe('buildDefaultSettings', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  it('should generate default settings', () => {
    const settings = buildDefaultSettings({
      templateName: 'test_template',
      packageName: 'test_package',
      type: 'logs',
      fields: [
        {
          name: 'field1Keyword',
          type: 'keyword',
        },
        {
          name: 'field2Boolean',
          type: 'boolean',
        },
      ],
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "codec": "best_compression",
          "lifecycle": Object {
            "name": "logs",
          },
          "query": Object {
            "default_field": Array [
              "field1Keyword",
            ],
          },
        },
      }
    `);
  });

  it('should log a warning if there is too many default fields', () => {
    const fields = [];
    for (let i = 0; i < 20000; i++) {
      fields.push({ name: `field${i}`, type: 'keyword' });
    }
    buildDefaultSettings({
      type: 'logs',
      templateName: 'test_template',
      packageName: 'test_package',
      fields,
    });

    expect(mockedLogger.warn).toBeCalledWith(
      'large amount of default fields detected for index template test_template in package test_package, applying the first 1024 fields'
    );
  });
});
