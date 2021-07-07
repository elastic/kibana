/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../common/lib/fetch');

import { getPdfJobParams } from './utils';
import { workpads } from '../../../../__fixtures__/workpads';
import { IBasePath } from 'kibana/public';

const basePath = ({
  prepend: jest.fn().mockImplementation((s) => `basepath/s/spacey/${s}`),
  get: () => 'basepath/s/spacey',
  serverBasePath: `basepath`,
} as unknown) as IBasePath;
const workpadSharingData = { workpad: workpads[0], pageCount: 12 };

test('getPdfJobParams returns the correct job params for canvas layout', () => {
  const jobParams = getPdfJobParams(workpadSharingData, basePath);
  expect(jobParams).toMatchInlineSnapshot(`
    Object {
      "browserTimezone": "America/New_York",
      "layout": Object {
        "dimensions": Object {
          "height": 0,
          "width": 0,
        },
        "id": "canvas",
      },
      "objectType": "canvas workpad",
      "relativeUrls": Array [
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/1",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/2",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/3",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/4",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/5",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/6",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/7",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/8",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/9",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/10",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/11",
        "/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/12",
      ],
      "title": "base workpad",
    }
  `);
});
