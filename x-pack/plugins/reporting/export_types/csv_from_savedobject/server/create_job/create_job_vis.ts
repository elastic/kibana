/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRangeParams, TsvbPanel, VisState } from '../../types';

interface VisData {
  title: string;
  visType: string;
  panel: TsvbPanel;
}

/*
 * The caller of this function calls other modules that return promise
 * This function is declared async for consistency
 */
export async function createJobVis(
  visStateJSON: string,
  timerange: TimeRangeParams
): Promise<VisData> {
  const { params, title, type: visType }: VisState = JSON.parse(visStateJSON);
  if (!params) {
    throw new Error('The saved object contained no panel data!');
  }

  const panel: TsvbPanel = {
    ...params,
    timerange,
  };

  return { panel, title, visType };
}
