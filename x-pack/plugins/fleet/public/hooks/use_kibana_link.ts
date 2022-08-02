/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from '@kbn/core/public';

import { KibanaAssetType } from '../types';

import { useStartServices } from '.';

const KIBANA_BASE_PATH = '/app/kibana';

const getKibanaLink = (http: HttpStart, path: string) => {
  return http.basePath.prepend(`${KIBANA_BASE_PATH}#${path}`);
};

/**
 * TODO: This is a temporary solution for getting links to various assets. It is very risky because:
 *
 * 1. The plugin might not exist/be enabled
 * 2. URLs and paths might not always be supported
 *
 * We should migrate to using the new URL service locators.
 *
 * @deprecated {@link Locators} from the new URL service need to be used instead.

 */
export const getHrefToObjectInKibanaApp = ({
  type,
  id,
  http,
}: {
  type: KibanaAssetType;
  id: string;
  http: HttpStart;
}): undefined | string => {
  let kibanaAppPath: undefined | string;
  switch (type) {
    case KibanaAssetType.dashboard:
      kibanaAppPath = `/dashboard/${id}`;
      break;
    case KibanaAssetType.search:
      kibanaAppPath = `/discover/${id}`;
      break;
    case KibanaAssetType.visualization:
      kibanaAppPath = `/visualize/edit/${id}`;
      break;
    default:
      return undefined;
  }

  return getKibanaLink(http, kibanaAppPath);
};

/**
 * TODO: This functionality needs to be replaced with use of the new URL service locators
 *
 * @deprecated {@link Locators} from the new URL service need to be used instead.
 */
export function useKibanaLink(path: string = '/') {
  const { http } = useStartServices();
  return getKibanaLink(http, path);
}
