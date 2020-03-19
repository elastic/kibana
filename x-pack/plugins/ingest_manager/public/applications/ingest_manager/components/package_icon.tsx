/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ICON_TYPES, EuiIcon, EuiIconProps } from '@elastic/eui';
import { PackageInfo, PackageListItem } from '../../../../common/types/models';
import { useLinks } from '../sections/epm/hooks';
import { epmRouteService } from '../../../../common/services';
import { sendRequest } from '../hooks/use_request';
import { GetInfoResponse } from '../types';
type Package = PackageInfo | PackageListItem;

const CACHED_ICONS = new Map<string, string>();

export const PackageIcon: React.FunctionComponent<{
  packageName: string;
  version?: string;
  icons?: Package['icons'];
} & Omit<EuiIconProps, 'type'>> = ({ packageName, version, icons, ...euiIconProps }) => {
  const iconType = usePackageIcon(packageName, version, icons);
  return <EuiIcon size="s" type={iconType} {...euiIconProps} />;
};

const usePackageIcon = (packageName: string, version?: string, icons?: Package['icons']) => {
  const { toImage } = useLinks();
  const [iconType, setIconType] = useState<string>('');
  const pkgKey = `${packageName}-${version ?? ''}`;

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

      CACHED_ICONS.set(pkgKey, 'package');
      setIconType('package');
    };
  }, [packageName, pkgKey, toImage]);

  useEffect(() => {
    if (CACHED_ICONS.has(pkgKey)) {
      setIconType(CACHED_ICONS.get(pkgKey) as string);
      return;
    }

    // Use API to see if package has icons defined
    if (!icons && version !== undefined) {
      fromPackageInfo(pkgKey)
        .catch(() => undefined) // ignore API errors
        .then(fromInput);
    } else {
      fromInput(icons);
    }
  }, [icons, toImage, packageName, version, fromInput, pkgKey]);

  return iconType;
};

const fromPackageInfo = async (pkgKey: string) => {
  const { data } = await sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgKey),
    method: 'get',
  });
  return data?.response?.icons;
};
