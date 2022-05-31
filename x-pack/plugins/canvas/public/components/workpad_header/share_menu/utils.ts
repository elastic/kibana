/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RedirectOptions } from '@kbn/share-plugin/public';
import { JobAppParamsPDFV2 } from '@kbn/reporting-plugin/common/types';
import { CanvasAppLocatorParams, CANVAS_APP_LOCATOR } from '../../../../common/locator';
import { CanvasWorkpad } from '../../../../types';

export interface CanvasWorkpadSharingData {
  workpad: Pick<CanvasWorkpad, 'id' | 'name' | 'height' | 'width'>;
  pageCount: number;
}

export function getPdfJobParams(
  { workpad: { id, name: title, width, height }, pageCount }: CanvasWorkpadSharingData,
  version: string
): JobAppParamsPDFV2 {
  // The viewport in Reporting by specifying the dimensions. In order for things to work,
  // we need a viewport that will include all of the pages in the workpad. The viewport
  // also needs to include any offset values from the 0,0 position, otherwise the cropped
  // screenshot that Reporting takes will be off the mark. Reporting will take a screenshot
  // of the entire viewport and then crop it down to the element that was asked for.

  // NOTE: while the above is true, the scaling seems to be broken. The export screen draws
  // pages at the 0,0 point, so the offset isn't currently required to get the correct
  // viewport size.

  // build a list of all page urls for exporting, they are captured one at a time

  const locatorParams: Array<RedirectOptions<CanvasAppLocatorParams>> = [];
  for (let i = 1; i <= pageCount; i++) {
    locatorParams.push({
      id: CANVAS_APP_LOCATOR,
      version,
      params: {
        view: 'workpadPDF',
        id,
        page: i,
      },
    });
  }

  return {
    layout: {
      dimensions: { width, height },
      id: 'canvas',
    },
    objectType: 'canvas workpad',
    locatorParams,
    title,
  };
}
