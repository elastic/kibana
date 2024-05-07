/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTitle, EuiCallOut } from '@elastic/eui';

import type {
  EsAssetReference,
  AssetSOObject,
  KibanaAssetReference,
  SimpleSOAssetType,
} from '../../../../../../../../common';
import { displayedAssetTypes } from '../../../../../../../../common/constants';

import { Error, ExtensionWrapper, Loading } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import {
  useGetPackageInstallStatus,
  useLink,
  useStartServices,
  useUIExtension,
  useAuthz,
  useFleetStatus,
} from '../../../../../hooks';

import { sendGetBulkAssets } from '../../../../../hooks';

import { DeferredAssetsSection } from './deferred_assets_accordion';

import { AssetsAccordion } from './assets_accordion';

interface AssetsPanelProps {
  packageInfo: PackageInfo;
  refetchPackageInfo: () => void;
}

export const AssetsPage = ({ packageInfo, refetchPackageInfo }: AssetsPanelProps) => {
  const { name, version } = packageInfo;

  const pkgkey = `${name}-${version}`;
  const { docLinks } = useStartServices();
  const { spaceId } = useFleetStatus();

  const customAssetsExtension = useUIExtension(packageInfo.name, 'package-detail-assets');

  const canReadPackageSettings = useAuthz().integrations.readPackageInfo;

  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(packageInfo.name);

  const pkgInstallationInfo =
    'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;

  const installedSpaceId = pkgInstallationInfo?.installed_kibana_space_id;
  const assetsInstalledInCurrentSpace = !installedSpaceId || installedSpaceId === spaceId;

  const [assetSavedObjectsByType, setAssetsSavedObjectsByType] = useState<
    Record<string, Record<string, SimpleSOAssetType & { appLink?: string }>>
  >({});
  const [deferredInstallations, setDeferredInstallations] = useState<EsAssetReference[]>();
  const pkgAssets = useMemo(
    () => [
      ...(assetsInstalledInCurrentSpace ? pkgInstallationInfo?.installed_kibana || [] : []),
      ...(pkgInstallationInfo?.installed_es || []),
    ],
    [
      assetsInstalledInCurrentSpace,
      pkgInstallationInfo?.installed_es,
      pkgInstallationInfo?.installed_kibana,
    ]
  );
  const pkgAssetsByType = useMemo(
    () =>
      pkgAssets.reduce((acc, asset) => {
        if (!acc[asset.type] && displayedAssetTypes.includes(asset.type)) {
          acc[asset.type] = [];
        }
        acc[asset.type].push(asset);
        return acc;
      }, {} as Record<string, Array<EsAssetReference | KibanaAssetReference>>),
    [pkgAssets]
  );
  const [fetchError, setFetchError] = useState<undefined | Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const forceRefreshAssets = useCallback(() => {
    if (refetchPackageInfo) {
      refetchPackageInfo();
    }
  }, [refetchPackageInfo]);

  useEffect(() => {
    const fetchAssetSavedObjects = async () => {
      if (!pkgInstallationInfo) {
        setIsLoading(false);
        return;
      }

      if (pkgAssets.length === 0) {
        setIsLoading(false);
        return;
      }

      if (pkgAssets.length > 0) {
        const deferredAssets = pkgAssets.filter((asset): asset is EsAssetReference => {
          return 'deferred' in asset && asset.deferred === true;
        });
        setDeferredInstallations(deferredAssets);
      }

      try {
        const assetIds: AssetSOObject[] = pkgAssets.map(({ id, type }) => ({
          id,
          type,
        }));

        const { data, error } = await sendGetBulkAssets({ assetIds });
        if (error) {
          setFetchError(error);
        } else {
          setAssetsSavedObjectsByType(
            (data?.items || []).reduce((acc, asset) => {
              if (!acc[asset.type]) {
                acc[asset.type] = {};
              }
              acc[asset.type][asset.id] = asset;
              return acc;
            }, {} as typeof assetSavedObjectsByType)
          );
        }
      } catch (e) {
        setFetchError(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssetSavedObjects();
  }, [packageInfo, pkgAssets, pkgInstallationInfo]);

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return <Redirect to={getPath('integration_details_overview', { pkgkey })} />;
  }

  const hasDeferredInstallations =
    Array.isArray(deferredInstallations) && deferredInstallations.length > 0;

  let content: JSX.Element | Array<JSX.Element | null> | null;
  if (isLoading) {
    content = <Loading />;
  } else if (!canReadPackageSettings) {
    content = (
      <EuiCallOut
        color="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.assetsPermissionErrorTitle"
            defaultMessage="Permission error"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.assets.assetsPermissionError"
          defaultMessage="You do not have permission to retrieve the Kibana saved object for that integration. Contact your administrator."
        />
      </EuiCallOut>
    );
  } else if (pkgAssets.length === 0) {
    if (customAssetsExtension) {
      // If a UI extension for custom asset entries is defined, render the custom component here despite
      // there being no saved objects found
      content = (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
          <EuiSpacer size="l" />
        </ExtensionWrapper>
      );
    } else {
      content = !hasDeferredInstallations ? (
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.assets.noAssetsFoundLabel"
              defaultMessage="No assets found"
            />
          </h2>
        </EuiTitle>
      ) : null;
    }
  } else {
    content = [
      // Show callout if Kibana assets are installed in a different space
      !assetsInstalledInCurrentSpace ? (
        <>
          <EuiCallOut
            heading="h2"
            title={
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpaceTitle"
                defaultMessage="Kibana assets not available in this space"
              />
            }
          >
            <p>
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpaceBody"
                defaultMessage="This integration is installed, but Kibana assets are not available in this space. {learnMoreLink}."
                values={{
                  learnMoreLink: (
                    <EuiLink
                      href={docLinks.links.fleet.installAndUninstallIntegrationAssets}
                      external
                    >
                      <FormattedMessage
                        id="xpack.fleet.epm.packageDetails.assets.assetsNotAvailableInCurrentSpace.learnMore"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiCallOut>

          <EuiSpacer size="m" />
        </>
      ) : null,

      // Ensure we add any custom assets provided via UI extension to the before other assets
      customAssetsExtension ? (
        <ExtensionWrapper>
          <customAssetsExtension.Component />
          <EuiSpacer size="l" />
        </ExtensionWrapper>
      ) : null,

      // List all assets by order of `displayedAssetTypes`
      ...displayedAssetTypes.map((assetType) => {
        const assets = pkgAssetsByType[assetType] || [];
        const soAssets = assetSavedObjectsByType[assetType] || {};
        const finalAssets = assets.map((asset) => {
          return {
            ...asset,
            ...soAssets[asset.id],
          };
        });

        if (!finalAssets.length) {
          return null;
        }

        return (
          <Fragment key={assetType}>
            <AssetsAccordion savedObjects={finalAssets} type={assetType} key={assetType} />
            <EuiSpacer size="l" />
          </Fragment>
        );
      }),
    ];
  }
  const deferredInstallationsContent = hasDeferredInstallations ? (
    <>
      <DeferredAssetsSection
        deferredInstallations={deferredInstallations}
        packageInfo={packageInfo}
        forceRefreshAssets={forceRefreshAssets}
      />
      <EuiSpacer size="m" />
    </>
  ) : null;

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        {fetchError && (
          <>
            <Error
              title={
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.assets.fetchAssetsErrorTitle"
                  defaultMessage="Error loading complete asset information"
                />
              }
              error={fetchError}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {deferredInstallationsContent}
        {content}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
