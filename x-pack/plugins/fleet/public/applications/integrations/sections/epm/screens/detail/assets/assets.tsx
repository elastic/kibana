/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { groupBy } from 'lodash';

import type { ResolvedSimpleSavedObject } from '@kbn/core/public';

import { Loading, Error, ExtensionWrapper } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import {
  useGetPackageInstallStatus,
  useLink,
  useStartServices,
  useUIExtension,
} from '../../../../../hooks';

import type { AssetSavedObject } from './types';
import { allowedAssetTypes } from './constants';
import { AssetsAccordion } from './assets_accordion';

const allowedAssetTypesLookup = new Set<string>(allowedAssetTypes);
interface AssetsPanelProps {
  packageInfo: PackageInfo;
}

export const AssetsPage = ({ packageInfo }: AssetsPanelProps) => {
  const { name, version } = packageInfo;
  const pkgkey = `${name}-${version}`;
  const {
    spaces,
    savedObjects: { client: savedObjectsClient },
  } = useStartServices();
  const customAssetsExtension = useUIExtension(packageInfo.name, 'package-detail-assets');

  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(packageInfo.name);

  // assume assets are installed in this space until we find otherwise
  const [assetsInstalledInCurrentSpace, setAssetsInstalledInCurrentSpace] = useState<boolean>(true);
  const [assetSavedObjects, setAssetsSavedObjects] = useState<undefined | AssetSavedObject[]>();
  const [fetchError, setFetchError] = useState<undefined | Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAssetSavedObjects = async () => {
      if ('savedObject' in packageInfo) {
        if (spaces) {
          const { id: spaceId } = await spaces.getActiveSpace();
          const assetInstallSpaceId = packageInfo.savedObject.attributes.installed_kibana_space_id;
          // if assets are installed in a different space no need to attempt to load them.
          if (assetInstallSpaceId && assetInstallSpaceId !== spaceId) {
            setAssetsInstalledInCurrentSpace(false);
            setIsLoading(false);
            return;
          }
        }

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

          // We don't have an API to know which SO types a user has access to, so instead we make a request for each
          // SO type and ignore the 403 errors
          const objectsByType = await Promise.all(
            Object.entries(groupBy(objectsToGet, 'type')).map(([type, objects]) =>
              savedObjectsClient
                .bulkResolve(objects)
                // Ignore privilege errors
                .catch((e: any) => {
                  if (e?.body?.statusCode === 403) {
                    return { resolved_objects: [] };
                  } else {
                    throw e;
                  }
                })
                .then(
                  ({
                    resolved_objects: resolvedObjects,
                  }: {
                    resolved_objects: ResolvedSimpleSavedObject[];
                  }) => {
                    return resolvedObjects
                      .map(({ saved_object: savedObject }) => savedObject)
                      .filter(
                        (savedObject) =>
                          savedObject?.error?.statusCode !== 404 &&
                          allowedAssetTypesLookup.has(savedObject.type)
                      ) as AssetSavedObject[];
                  }
                )
            )
          );
          setAssetsSavedObjects(objectsByType.flat());
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
  }, [savedObjectsClient, packageInfo, spaces]);

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return <Redirect to={getPath('integration_details_overview', { pkgkey })} />;
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
  } else if (!assetsInstalledInCurrentSpace) {
    content = (
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpace"
            defaultMessage="This integration is installed, but no assets are available in this space"
          />
        </h2>
      </EuiTitle>
    );
  } else if (assetSavedObjects === undefined || assetSavedObjects.length === 0) {
    if (customAssetsExtension) {
      // If a UI extension for custom asset entries is defined, render the custom component here despite
      // there being no saved objects found
      content = (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
        </ExtensionWrapper>
      );
    } else {
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
    }
  } else {
    content = [
      ...allowedAssetTypes.map((assetType) => {
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
      }),
      // Ensure we add any custom assets provided via UI extension to the end of the list of other assets
      customAssetsExtension ? (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
        </ExtensionWrapper>
      ) : null,
    ];
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
