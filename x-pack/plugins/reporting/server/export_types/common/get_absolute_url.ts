/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';

interface AbsoluteURLFactoryOptions {
  basePath: string;
  protocol: string;
  hostname: string;
  port: string | number;
}

export const getAbsoluteUrlFactory = ({
  protocol,
  hostname,
  port,
  basePath,
}: AbsoluteURLFactoryOptions) => {
  return function getAbsoluteUrl({ hash = '', path = '/app/kibana', search = '' } = {}) {
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
