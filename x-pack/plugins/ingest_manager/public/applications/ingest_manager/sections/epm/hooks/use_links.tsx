/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { generatePath } from 'react-router-dom';
import { useCore } from '../../../hooks/use_core';
import { PLUGIN_ID } from '../../../constants';
import { epmRouteService } from '../../../services';
import { DetailViewPanelName } from '../../../types';
import { BASE_PATH, EPM_PATH, EPM_DETAIL_VIEW_PATH } from '../../../constants';

// TODO: get this from server/packages/handlers.ts (move elsewhere?)
// seems like part of the name@version change
interface DetailParams {
  name: string;
  version: string;
  panel?: DetailViewPanelName;
  withAppRoot?: boolean;
}

const removeRelativePath = (relativePath: string): string =>
  new URL(relativePath, 'http://example.com').pathname;

export function useLinks() {
  const { http } = useCore();
  function appRoot(path: string) {
    // include '#' because we're using HashRouter
    return http.basePath.prepend(BASE_PATH + '#' + path);
  }

  return {
    toAssets: (path: string) =>
      http.basePath.prepend(
        `/plugins/${PLUGIN_ID}/applications/ingest_manager/sections/epm/assets/${path}`
      ),
    toImage: (path: string) => http.basePath.prepend(epmRouteService.getFilePath(path)),
    toRelativeImage: ({
      path,
      packageName,
      version,
    }: {
      path: string;
      packageName: string;
      version: string;
    }) => {
      const imagePath = removeRelativePath(path);
      const pkgkey = `${packageName}-${version}`;
      const filePath = `${epmRouteService.getInfoPath(pkgkey)}/${imagePath}`;
      return http.basePath.prepend(filePath);
    },
    toListView: () => appRoot(EPM_PATH),
    toDetailView: ({ name, version, panel, withAppRoot = true }: DetailParams) => {
      // panel is optional, but `generatePath` won't accept `path: undefined`
      // so use this to pass `{ pkgkey }` or `{ pkgkey, panel }`
      const params = Object.assign({ pkgkey: `${name}-${version}` }, panel ? { panel } : {});
      const path = generatePath(EPM_DETAIL_VIEW_PATH, params);
      return withAppRoot ? appRoot(path) : path;
    },
  };
}
