/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ICON_TYPES } from '@elastic/eui';

import type { PackageInfo, PackageListItem } from '../types';

// TODO: Determine whether this can be relocated
// Import the specific hook to avoid a circular dependency in Babel
import { useLinks as useEPMLinks } from '../applications/integrations/hooks/use_links';

import { sendGetPackageInfoByKey } from './index';

type Package = PackageInfo | PackageListItem;

export interface UsePackageIconType {
  packageName: string;
  integrationName?: string;
  version: Package['version'];
  icons?: Package['icons'];
  tryApi?: boolean; // should it call API to try to find missing icons?
}

const CACHED_ICONS = new Map<string, string>();

export const usePackageIconType = ({
  packageName,
  integrationName,
  version,
  icons: paramIcons,
  tryApi = false,
}: UsePackageIconType) => {
  const { toPackageImage } = useEPMLinks();
  const [iconList, setIconList] = useState<UsePackageIconType['icons']>();
  const [iconType, setIconType] = useState<string>(''); // FIXME: use `empty` icon during initialization - see: https://github.com/elastic/kibana/issues/60622
  const cacheKey = `${packageName}-${version}${integrationName ? `-${integrationName}` : ''}`;

  // Generates an icon path or Eui Icon name based on an icon list from the package
  // or by using the package name against logo icons from Eui
  useEffect(() => {
    if (CACHED_ICONS.has(cacheKey)) {
      setIconType(CACHED_ICONS.get(cacheKey) || '');
      return;
    }
    const svgIcons = (paramIcons && paramIcons.length ? paramIcons : iconList)?.filter(
      (iconDef) => iconDef.type === 'image/svg+xml'
    );
    const localIconSrc =
      Array.isArray(svgIcons) && toPackageImage(svgIcons[0], packageName, version);
    if (localIconSrc) {
      CACHED_ICONS.set(cacheKey, localIconSrc);
      setIconType(CACHED_ICONS.get(cacheKey) || '');
      return;
    }

    const euiLogoIcon = ICON_TYPES.find((key) => key.toLowerCase() === `logo${packageName}`);
    if (euiLogoIcon) {
      CACHED_ICONS.set(cacheKey, euiLogoIcon);
      setIconType(euiLogoIcon);
      return;
    }

    if (tryApi && !paramIcons && !iconList) {
      sendGetPackageInfoByKey(packageName, version)
        .catch((error) => undefined) // Ignore API errors
        .then((res) => {
          CACHED_ICONS.delete(cacheKey);
          setIconList(res?.data?.item?.icons);
        });
    }

    CACHED_ICONS.set(cacheKey, 'package');
    setIconType('package');
  }, [paramIcons, cacheKey, toPackageImage, iconList, packageName, iconType, tryApi, version]);
  return iconType;
};
