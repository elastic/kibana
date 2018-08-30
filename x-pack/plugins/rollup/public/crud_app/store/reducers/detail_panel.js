/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const initialState = {
  isOpen: false,
  panelType: undefined,
  jobId: undefined,
};

export function detailPanel(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case 'INDEX_ROLLUP_JOB_OPEN_DETAIL_PANEL':
      const {
        panelType,
        jobId,
      } = payload;

      return {
        panelType,
        jobId,
        isOpen: true,
      };

    case 'INDEX_ROLLUP_JOB_CLOSE_DETAIL_PANEL':
      return {
        panelType: undefined,
        jobId: undefined,
        isOpen: false,
      };

    default:
      return state;
  }
}
