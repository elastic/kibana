/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { useKibanaServicesContext } from '../context/kibana_services/use_kibana_services_context';

export function useKibanaUrl(path: string, urlObject?: url.UrlObject) {
  const { http } = useKibanaServicesContext();
  return url.format({
    ...urlObject,
    pathname: http.basePath.prepend(path),
  });
}
