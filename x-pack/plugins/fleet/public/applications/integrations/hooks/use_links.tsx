/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStartServices } from '../../../hooks/use_core';
import { PLUGIN_ID } from '../../../constants';
import { epmRouteService } from '../../../services';
import type { PackageSpecIcon, PackageSpecScreenshot, RegistryImage } from '../../../../common';

const removeRelativePath = (relativePath: string): string =>
  new URL(relativePath, 'http://example.com').pathname;

export function useLinks() {
  const { http } = useStartServices();
  return {
    toAssets: (path: string) => http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${path}`),
    toPackageImage: (
      img: PackageSpecIcon | PackageSpecScreenshot | RegistryImage,
      pkgName: string,
      pkgVersion: string
    ): string | undefined => {
      const sourcePath = img.src
        ? `/package/${pkgName}/${pkgVersion}${img.src}`
        : 'path' in img && img.path;
      if (sourcePath) {
        const filePath = epmRouteService.getFilePath(sourcePath);
        return http.basePath.prepend(filePath);
      }
    },
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
  };
}
