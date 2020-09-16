/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';

interface AbsoluteURLFactoryOptions {
  defaultBasePath: string;
  protocol: string;
  hostname: string;
  port: string | number;
}

export const getAbsoluteUrlFactory = ({
  protocol,
  hostname,
  port,
  defaultBasePath, // never gets an override
}: AbsoluteURLFactoryOptions) => {
  return function getAbsoluteUrl({
    basePath = defaultBasePath, // unused
    hash = '',
    path = '/app/kibana',
    search = '',
  } = {}) {
    return url.format({
      protocol,
      hostname,
      port,
      pathname: basePath + path,
      hash,
      search,
    });
  };
};
