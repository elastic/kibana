/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inlineToProjectZip } from './inline_to_zip';
import { unzipFile } from './unzipt_project_code';

describe('inlineToProjectZip', () => {
  it('should return base64 encoded zip data', async () => {
    const inlineJourney = `
step('goto', () => page.goto('https://elastic.co'));
step('throw error', () => { throw new Error('error'); });
`;
    const monitorId = 'testMonitorId';
    const logger = jest.fn();

    // @ts-expect-error not checking logger functionality
    const result = await inlineToProjectZip(inlineJourney, monitorId, logger);

    expect(result.length).toBeGreaterThan(0);
    expect(await unzipFile(result)).toEqual(
      `import { journey, step, expect } from '@elastic/synthetics';

journey('inline', ({ page, context, browser, params, request }) => {

step('goto', () => page.goto('https://elastic.co'));
step('throw error', () => { throw new Error('error'); });

});`
    );
  });
});
