/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { ICON_TYPES } from '@elastic/eui';
import { PackageInfo, PackageListItem } from '../types';
import { useLinks } from '../sections/epm/hooks';
import { sendGetPackageInfoByKey } from './index';

type Package = PackageInfo | PackageListItem;

export interface UsePackageIconType {
  packageName: Package['name'];
  version: Package['version'];
  icons?: Package['icons'];
  tryApi?: boolean; // should it call API to try to find missing icons?
}

const CACHED_ICONS = new Map<string, string>();

export const usePackageIconType = ({
  packageName,
  version,
  icons: paramIcons,
  tryApi = false,
}: UsePackageIconType) => {
  const { toImage } = useLinks();
  const [iconList, setIconList] = useState<UsePackageIconType['icons']>();
  const [iconType, setIconType] = useState<string>(''); // FIXME: use `empty` icon during initialization - see: https://github.com/elastic/kibana/issues/60622
  const pkgKey = `${packageName}-${version}`;

  // Generates an icon path or Eui Icon name based on an icon list from the package
  // or by using the package name against logo icons from Eui
  useEffect(() => {
    if (CACHED_ICONS.has(pkgKey)) {
      setIconType(CACHED_ICONS.get(pkgKey) || '');
      return;
    }
    const svgIcons = (paramIcons || iconList)?.filter(
      (iconDef) => iconDef.type === 'image/svg+xml'
    );
    const localIconSrc = Array.isArray(svgIcons) && svgIcons[0]?.src;
    if (localIconSrc) {
      CACHED_ICONS.set(pkgKey, toImage(localIconSrc));
      setIconType(CACHED_ICONS.get(pkgKey) || '');
      return;
    }

    const euiLogoIcon = ICON_TYPES.find((key) => key.toLowerCase() === `logo${packageName}`);
    if (euiLogoIcon) {
      CACHED_ICONS.set(pkgKey, euiLogoIcon);
      setIconType(euiLogoIcon);
      return;
    }

    if (tryApi && !paramIcons && !iconList) {
      sendGetPackageInfoByKey(pkgKey)
        .catch((error) => undefined) // Ignore API errors
        .then((res) => {
          CACHED_ICONS.delete(pkgKey);
          setIconList(res?.data?.response?.icons);
        });
    }

    CACHED_ICONS.set(pkgKey, 'package');
    setIconType('package');
  }, [paramIcons, pkgKey, toImage, iconList, packageName, iconType, tryApi]);

  return iconType;
};
