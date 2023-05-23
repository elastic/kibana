/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import { ReportingServerInfo } from '../../../core';
import { ReportingConfigType } from '../../../config';
import { buildKibanaPath } from '../../../../common/build_kibana_path';
import { getRedirectAppPath } from '../../../../common/constants';

export function getFullRedirectAppUrl(
  config: ReportingConfigType,
  serverInfo: ReportingServerInfo,
  spaceId?: string,
  forceNow?: string
) {
  const {
    kibanaServer: { protocol, hostname, port },
  } = config;
  const path = buildKibanaPath({
    basePath: serverInfo.basePath,
    spaceId,
    appPath: getRedirectAppPath(),
  });

  return format({
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
    pathname: path,
    query: forceNow ? { forceNow } : undefined,
  });
}
