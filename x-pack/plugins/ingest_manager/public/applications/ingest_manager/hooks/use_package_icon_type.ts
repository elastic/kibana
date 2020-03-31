/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { ICON_TYPES } from '@elastic/eui';
import { PackageInfo, PackageListItem } from '../../../../common/types/models';
import { useLinks } from '../sections/epm/hooks';

type Package = PackageInfo | PackageListItem;

export interface UsePackageIconType {
  packageName: Package['name'];
  version?: Package['version'];
  icons?: Package['icons'];
}

const CACHED_ICONS = new Map<string, string>();

export const usePackageIconType = ({
  packageName = '',
  version = '',
  icons = [],
}: UsePackageIconType) => {
  const { toImage } = useLinks();
  const [iconType, setIconType] = useState<string>(''); // FIXME: use `empty` icon during initialization - see: https://github.com/elastic/kibana/issues/60622
  const pkgKey = `${packageName}-${version}`;
  const defaultType = 'package';

  // Generates an icon path or Eui Icon name based on an icon list from the package
  // or by using the package name against logo icons from Eui
  const fromInput = useMemo(() => {
    return (iconList?: Package['icons']) => {
      const svgIcons = iconList?.filter(iconDef => iconDef.type === 'image/svg+xml');
      const localIconSrc = Array.isArray(svgIcons) && svgIcons[0]?.src;
      if (localIconSrc) {
        CACHED_ICONS.set(pkgKey, toImage(localIconSrc));
        setIconType(CACHED_ICONS.get(pkgKey) as string);
        return;
      }

      const euiLogoIcon = ICON_TYPES.find(key => key.toLowerCase() === `logo${packageName}`);
      if (euiLogoIcon) {
        CACHED_ICONS.set(pkgKey, euiLogoIcon);
        setIconType(euiLogoIcon);
        return;
      }

      CACHED_ICONS.set(pkgKey, defaultType);
      setIconType(defaultType);
    };
  }, [packageName, pkgKey, toImage]);

  useEffect(() => {
    if (CACHED_ICONS.has(pkgKey)) {
      setIconType(CACHED_ICONS.get(pkgKey) || '');
      return;
    }

    if (icons) {
      fromInput(icons);
    }
  }, [icons, toImage, packageName, version, fromInput, pkgKey, iconType]);

  return iconType;
};
