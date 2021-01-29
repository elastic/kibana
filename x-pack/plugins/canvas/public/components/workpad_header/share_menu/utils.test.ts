/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../common/lib/fetch');

import { getPdfUrl, createPdf, LayoutType } from './utils';
import { workpads } from '../../../../__fixtures__/workpads';
import { fetch } from '../../../../common/lib/fetch';
import { IBasePath } from 'kibana/public';

const basePath = ({
  prepend: jest.fn().mockImplementation((s) => `basepath/s/spacey/${s}`),
  get: () => 'basepath/s/spacey',
  serverBasePath: `basepath`,
} as unknown) as IBasePath;
const workpad = workpads[0];

test('getPdfUrl returns the correct url for canvas layout', () => {
  ['canvas', 'preserve_layout'].forEach((layout) => {
    const url = getPdfUrl(workpad, layout as LayoutType, { pageCount: 2 }, basePath);

    expect(url).toMatchInlineSnapshot(
      `"basepath/s/spacey//api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FNew_York,layout:(dimensions:(height:0,width:0),id:${layout}),objectType:'canvas%20workpad',relativeUrls:!(%2Fs%2Fspacey%2Fapp%2Fcanvas%23%2Fexport%2Fworkpad%2Fpdf%2Fbase-workpad%2Fpage%2F1,%2Fs%2Fspacey%2Fapp%2Fcanvas%23%2Fexport%2Fworkpad%2Fpdf%2Fbase-workpad%2Fpage%2F2),title:'base%20workpad')"`
    );
  });
});

test('createPdf posts to create the pdf with canvas layout', () => {
  ['canvas', 'preserve_layout'].forEach((layout, index) => {
    createPdf(workpad, layout as LayoutType, { pageCount: 2 }, basePath);

    expect(fetch.post).toBeCalled();

    const args = (fetch.post as jest.MockedFunction<typeof fetch.post>).mock.calls[index];

    expect(args[0]).toMatchInlineSnapshot(
      `"basepath/s/spacey//api/reporting/generate/printablePdf"`
    );
    expect(args[1]).toMatchInlineSnapshot(`
      Object {
        "jobParams": "(browserTimezone:America/New_York,layout:(dimensions:(height:0,width:0),id:${layout}),objectType:'canvas workpad',relativeUrls:!(/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/1,/s/spacey/app/canvas#/export/workpad/pdf/base-workpad/page/2),title:'base workpad')",
      }
    `);
  });
});
