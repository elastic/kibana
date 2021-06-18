/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';

import { Loading, Error } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import { useGetPackageInstallStatus, useLink, useStartServices } from '../../../../../hooks';

import type { AssetSavedObject } from './types';
import { allowedAssetTypes } from './constants';
import { AssetsAccordion } from './assets_accordion';

interface AssetsPanelProps {
  packageInfo: PackageInfo;
}

export const AssetsPage = ({ packageInfo }: AssetsPanelProps) => {
  const { name, version } = packageInfo;
  const {
    savedObjects: { client: savedObjectsClient },
  } = useStartServices();

  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(packageInfo.name);

  const [assetSavedObjects, setAssetsSavedObjects] = useState<undefined | AssetSavedObject[]>();
  const [fetchError, setFetchError] = useState<undefined | Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAssetSavedObjects = async () => {
      if ('savedObject' in packageInfo) {
        const {
          savedObject: { attributes: packageAttributes },
        } = packageInfo;

        if (
          !packageAttributes.installed_kibana ||
          packageAttributes.installed_kibana.length === 0
        ) {
          setIsLoading(false);
          return;
        }

        try {
          const objectsToGet = packageAttributes.installed_kibana.map(({ id, type }) => ({
            id,
            type,
          }));
          const { savedObjects } = await savedObjectsClient.bulkGet(objectsToGet);
          setAssetsSavedObjects(savedObjects as AssetSavedObject[]);
        } catch (e) {
          setFetchError(e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchAssetSavedObjects();
  }, [savedObjectsClient, packageInfo]);

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return (
      <Redirect
        to={getPath('integration_details_overview', {
          pkgkey: `${name}-${version}`,
        })}
      />
    );
  }

  let content: JSX.Element | Array<JSX.Element | null>;

  if (isLoading) {
    content = <Loading />;
  } else if (fetchError) {
    content = (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.fetchAssetsErrorTitle"
            defaultMessage="Error loading assets"
          />
        }
        error={fetchError}
      />
    );
  } else if (assetSavedObjects === undefined) {
    content = (
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.noAssetsFoundLabel"
            defaultMessage="No assets found"
          />
        </h2>
      </EuiTitle>
    );
  } else {
    content = allowedAssetTypes.map((assetType) => {
      const sectionAssetSavedObjects = assetSavedObjects.filter((so) => so.type === assetType);

      if (!sectionAssetSavedObjects.length) {
        return null;
      }

      return (
        <>
          <AssetsAccordion savedObjects={sectionAssetSavedObjects} type={assetType} />
          <EuiSpacer size="l" />
        </>
      );
    });
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
