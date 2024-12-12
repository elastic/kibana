/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';
import { unzipFile } from '../../common/unzip_project_code';
import {
  dropInlineScriptForTransmission,
  mapInlineToProjectFields,
} from './map_inline_to_project_fields';
import * as inlineToZip from '../../common/inline_to_zip';

describe('dropInlineScriptForTransmission', () => {
  it('omits the inline script if there is project content available', () => {
    expect(
      dropInlineScriptForTransmission({
        [ConfigKey.SOURCE_INLINE]: 'this monitor has project content',
        [ConfigKey.SOURCE_PROJECT_CONTENT]: 'so we should remove the inline script',
        [ConfigKey.MONITOR_TYPE]: 'browser',
        [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
      } as MonitorFields)
    ).toEqual({
      [ConfigKey.SOURCE_PROJECT_CONTENT]: 'so we should remove the inline script',
      [ConfigKey.MONITOR_TYPE]: 'browser',
      [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
    });
  });

  it('returns the original monitor if there is no project content', () => {
    expect(
      dropInlineScriptForTransmission({
        [ConfigKey.SOURCE_INLINE]: 'this is an old monitor that has no zip content',
        [ConfigKey.MONITOR_TYPE]: 'browser',
        [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
      } as MonitorFields)
    ).toEqual({
      [ConfigKey.SOURCE_INLINE]: 'this is an old monitor that has no zip content',
      [ConfigKey.MONITOR_TYPE]: 'browser',
      [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
    });
  });

  it('returns the original monitor if it is not of type `browser`', () => {
    expect(
      dropInlineScriptForTransmission({
        [ConfigKey.MONITOR_TYPE]: 'http',
        [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
      } as MonitorFields)
    ).toEqual({
      [ConfigKey.MONITOR_TYPE]: 'http',
      [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
    });
  });

  it('returns the original monitor if it is not a UI monitor', () => {
    expect(
      dropInlineScriptForTransmission({
        [ConfigKey.SOURCE_PROJECT_CONTENT]: 'so we should remove the inline script',
        [ConfigKey.MONITOR_TYPE]: 'browser',
        [ConfigKey.MONITOR_SOURCE_TYPE]: 'project',
      } as MonitorFields)
    ).toEqual({
      [ConfigKey.SOURCE_PROJECT_CONTENT]: 'so we should remove the inline script',
      [ConfigKey.MONITOR_TYPE]: 'browser',
      [ConfigKey.MONITOR_SOURCE_TYPE]: 'project',
    });
  });
});

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
      const result = await mapInlineToProjectFields({
        monitorType,
        monitor: {},
        logger: logger as any,
      });
      expect(result).toEqual({});
    }
  );

  it('should return an empty object if the inline script is empty', async () => {
    const result = await mapInlineToProjectFields({
      monitorType: 'browser',
      monitor: { [ConfigKey.SOURCE_PROJECT_CONTENT]: 'foo' },
      logger: logger as any,
    });
    expect(result).toEqual({});
  });

  it.each([true, false])(
    'should zip the source inline and return it as project content',
    async (includeInlineScript) => {
      const expectedInlineScript = `step('goto', () => page.goto('https://elastic.co'))`;
      const result = await mapInlineToProjectFields({
        monitorType: 'browser',
        monitor: {
          [ConfigKey.SOURCE_INLINE]: expectedInlineScript,
        },
        logger: logger as any,
        includeInlineScript,
      });
      expect(result[ConfigKey.SOURCE_INLINE]).toEqual(
        includeInlineScript ? expectedInlineScript : undefined
      );
      expect(await unzipFile(result[ConfigKey.SOURCE_PROJECT_CONTENT] ?? ''))
        .toMatchInlineSnapshot(`
      "import { journey, step, expect, mfa } from '@elastic/synthetics';

      journey('inline', ({ page, context, browser, params, request }) => {
      step('goto', () => page.goto('https://elastic.co'))
      });"
    `);
    }
  );

  it('should return the inline script if the zipping fails', async () => {
    jest.spyOn(inlineToZip, 'inlineToProjectZip').mockImplementationOnce(async () => {
      throw new Error('Failed to zip');
    });

    const result = await mapInlineToProjectFields({
      monitorType: 'browser',
      monitor: {
        [ConfigKey.SOURCE_INLINE]: 'foo',
      },
      logger: logger as any,
    });
    expect(result[ConfigKey.SOURCE_INLINE]).toEqual('foo');
  });
});
