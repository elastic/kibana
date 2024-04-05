/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const openRemoteKibana = (url: string, path?: string) => {
  window.open(formatRemoteKibanaUrl(url, path), '_blank');
};

const formatRemoteKibanaUrl = (url: string, path?: string) => {
  if (url.endsWith('/') && path?.startsWith('/')) {
    return url + path.slice(1);
  } else {
    return url + path;
  }
};
