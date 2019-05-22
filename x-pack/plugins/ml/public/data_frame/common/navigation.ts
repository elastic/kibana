/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';

import chrome from 'ui/chrome';

export function moveToDataFrameWizard() {
  window.location.href = '#/data_frames/new_job';
}

export function moveToDataFrameJobsList() {
  window.location.href = '#/data_frames';
}

export function moveToDiscover(indexPatternId: string, kbnBaseUrl: string) {
  const _g = rison.encode({});

  // Add the index pattern ID to the appState part of the URL.
  const _a = rison.encode({
    index: indexPatternId,
  });

  const baseUrl = chrome.addBasePath(kbnBaseUrl);
  const hash = `#/discover?_g=${_g}&_a=${_a}`;

  window.location.href = `${baseUrl}${hash}`;
}
