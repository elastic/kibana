/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { React } from 'react';

let lazyLoadPromise: Promise<React.ComponentType<unknown>>;

export async function getFileUploadComponent(): Promise<React.ComponentType<unknown>> {
  if (typeof lazyLoadPromise !== 'undefined') {
    return lazyLoadPromise;
  }

  lazyLoadPromise = new Promise(async (resolve) => {
    // @ts-expect-error
    const { JsonUploadAndParse } = await import('./components/json_upload_and_parse');
    resolve(JsonUploadAndParse);
  });
  return lazyLoadPromise;
}
