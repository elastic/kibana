/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from 'src/core/public';

import { useStartServices } from './';

const KIBANA_BASE_PATH = '/app/kibana';

/**
 * @deprecated See comment on {@link useKibanaLink}
 */
export const getKibanaLink = (http: HttpStart, path: string) => {
  return http.basePath.prepend(`${KIBANA_BASE_PATH}#${path}`);
};

/**
 * TODO: This functionality needs to be replaced with use of the new URL service locators
 * @deprecated
 */
export function useKibanaLink(path: string = '/') {
  const { http } = useStartServices();
  return getKibanaLink(http, path);
}
