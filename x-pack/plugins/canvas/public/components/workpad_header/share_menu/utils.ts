/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { IBasePath } from 'kibana/public';
import { fetch } from '../../../../common/lib/fetch';
import { CanvasWorkpad } from '../../../../types';
import { url } from '../../../../../../../src/plugins/kibana_utils/public';

// type of the desired pdf output (print or preserve_layout)
const PDF_LAYOUT_TYPE = 'preserve_layout';

interface PageCount {
  pageCount: number;
}

type Arguments = [CanvasWorkpad, PageCount, IBasePath];

interface PdfUrlData {
  createPdfUri: string;
  createPdfPayload: { jobParams: string };
}

function getPdfUrlParts(
  { id, name: title, width, height }: CanvasWorkpad,
  { pageCount }: PageCount,
  basePath: IBasePath
): PdfUrlData {
  const reportingEntry = basePath.prepend('/api/reporting/generate');
  const urlPrefix = basePath.get().replace(basePath.serverBasePath, ''); // for Spaces prefix, which is included in basePath.get()
  const canvasEntry = `${urlPrefix}/app/canvas#`;

  // The viewport in Reporting by specifying the dimensions. In order for things to work,
  // we need a viewport that will include all of the pages in the workpad. The viewport
  // also needs to include any offset values from the 0,0 position, otherwise the cropped
  // screenshot that Reporting takes will be off the mark. Reporting will take a screenshot
  // of the entire viewport and then crop it down to the element that was asked for.

  // NOTE: while the above is true, the scaling seems to be broken. The export screen draws
  // pages at the 0,0 point, so the offset isn't currently required to get the correct
  // viewport size.

  // build a list of all page urls for exporting, they are captured one at a time
  const workpadUrls = [];
  for (let i = 1; i <= pageCount; i++) {
    workpadUrls.push(rison.encode(`${canvasEntry}/export/workpad/pdf/${id}/page/${i}`));
  }

  const jobParams = {
    browserTimezone: 'America/Phoenix', // TODO: get browser timezone, or Kibana setting?
    layout: {
      dimensions: { width, height },
      id: PDF_LAYOUT_TYPE,
    },
    objectType: 'canvas workpad',
    relativeUrls: workpadUrls,
    title,
  };

  return {
    createPdfUri: `${reportingEntry}/printablePdf`,
    createPdfPayload: {
      jobParams: rison.encode(jobParams),
    },
  };
}

export function getPdfUrl(...args: Arguments): string {
  const urlParts = getPdfUrlParts(...args);
  const param = (key: string, val: any) =>
    url.encodeUriQuery(key, true) + (val === true ? '' : '=' + url.encodeUriQuery(val, true));

  return `${urlParts.createPdfUri}?${param('jobParams', urlParts.createPdfPayload.jobParams)}`;
}

export function createPdf(...args: Arguments) {
  const { createPdfUri, createPdfPayload } = getPdfUrlParts(...args);
  return fetch.post(createPdfUri, createPdfPayload);
}
