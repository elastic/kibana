/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ConfigKey } from '../../../common/runtime_types';
import { unzipFile } from '../../common/unzip_project_code';
import { mapInlineToProjectFields } from './map_inline_to_project_fields';
import * as inlineToZip from '../../common/inline_to_zip';

describe('mapInlineToProjectFields', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  it.each(['http', 'tcp', 'icmp'])(
    'should return an empty object if the monitor type is not browser',
    async (monitorType) => {
      const result = await mapInlineToProjectFields(monitorType, {}, logger as any);
      expect(result).toEqual({});
    }
  );

  it('should return an empty object if the inline script is empty', async () => {
    const result = await mapInlineToProjectFields(
      'browser',
      { [ConfigKey.SOURCE_PROJECT_CONTENT]: 'foo' },
      logger as any
    );
    expect(result).toEqual({});
  });

  it('should zip the source inline and return it as project content', async () => {
    const result = await mapInlineToProjectFields(
      'browser',
      {
        [ConfigKey.SOURCE_INLINE]: `step('goto', () => page.goto('https://elastic.co'))`,
      },
      logger as any
    );
    expect(result[ConfigKey.SOURCE_INLINE]).toEqual('');
    expect(await unzipFile(result[ConfigKey.SOURCE_PROJECT_CONTENT] ?? '')).toMatchInlineSnapshot(`
      "import { journey, step, expect } from '@elastic/synthetics';

      journey('inline', ({ page, context, browser, params, request }) => {
      step('goto', () => page.goto('https://elastic.co'))
      });"
    `);
  });

  it('should return the inline script if the zipping fails', async () => {
    jest.spyOn(inlineToZip, 'inlineToProjectZip').mockImplementationOnce(async () => {
      throw new Error('Failed to zip');
    });

    const result = await mapInlineToProjectFields(
      'browser',
      {
        [ConfigKey.SOURCE_INLINE]: 'foo',
      },
      logger as any
    );
    expect(result[ConfigKey.SOURCE_INLINE]).toEqual('foo');
  });
});
