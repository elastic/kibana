/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import { ReportingConfig } from '../../../';
import { getRedirectAppPath } from '../../../../common/constants';
import { buildKibanaPath } from '../../../../common/build_kibana_path';

export function getFullRedirectAppUrl(
  config: ReportingConfig,
  spaceId?: string,
  forceNow?: string
) {
  const [basePath, protocol, hostname, port] = [
    config.kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
  ] as string[];

  const path = buildKibanaPath({
    basePath,
    spaceId,
    appPath: getRedirectAppPath(),
  });

  return format({
    protocol,
    hostname,
    port,
    pathname: path,
    query: forceNow ? { forceNow } : undefined,
  });
}
