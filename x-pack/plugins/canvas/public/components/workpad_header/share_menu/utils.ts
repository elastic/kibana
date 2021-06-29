/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from 'kibana/public';
import moment from 'moment-timezone';
import rison from 'rison-node';
import { BaseParams } from '../../../../../reporting/common/types';
import { CanvasWorkpad } from '../../../../types';

export interface CanvasWorkpadSharingData {
  workpad: Pick<CanvasWorkpad, 'id' | 'name' | 'height' | 'width'>;
  pageCount: number;
}

// TODO: get the correct type from Reporting plugin
type JobParamsPDF = BaseParams & { relativeUrls: string[] };

export function getPdfJobParams(
  { workpad: { id, name: title, width, height }, pageCount }: CanvasWorkpadSharingData,
  basePath: IBasePath
): JobParamsPDF {
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

  return {
    browserTimezone: moment.tz.guess(),
    layout: {
      dimensions: { width, height },
      id: 'canvas',
    },
    objectType: 'canvas workpad',
    relativeUrls: workpadUrls,
    title,
  };
}
