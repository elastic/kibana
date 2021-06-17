/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import type { SimpleSavedObject } from 'src/core/public';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  EuiBadge,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';

import { Loading } from '../../../../../components';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus, KibanaAssetType } from '../../../../../types';

import { useGetPackageInstallStatus, useLink, useStartServices } from '../../../../../hooks';

import { AssetTitleMap } from '../../../../../constants';

import './assets.scss';

interface AssetsPanelProps {
  packageInfo: PackageInfo;
}

const allowedAssetTypes: KibanaAssetType[] = [
  KibanaAssetType.dashboard,
  KibanaAssetType.search,
  KibanaAssetType.visualization,
];

type AssetSavedObject = SimpleSavedObject<{ title: string; description?: string }>;

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
          const { savedObjects } = await savedObjectsClient.bulkGet(
            packageAttributes.installed_kibana.map(({ id, type }) => ({
              id,
              type,
            }))
          );
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

  let content: JSX.Element;

  if (isLoading) {
    content = <Loading />;
  } else if (fetchError) {
    content = <p>TODO HANDLE ERROR</p>;
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
    content = (
      <>
        {allowedAssetTypes.map((assetType) => {
          const sectionAssetSavedObjects = assetSavedObjects.filter((so) => so.type === assetType);
          if (!sectionAssetSavedObjects.length) {
            return null;
          }

          return (
            <>
              <EuiAccordion
                buttonContent={
                  <EuiFlexGroup
                    justifyContent="center"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="s">
                        <h3>{AssetTitleMap[assetType]}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge>{sectionAssetSavedObjects.length}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                id={assetType}
              >
                <>
                  <EuiSpacer size="l" />
                  <EuiSplitPanel.Outer
                    className="customOuterSplitPanel"
                    hasBorder
                    hasShadow={false}
                  >
                    {sectionAssetSavedObjects.map(({ attributes: { title, description } }, idx) => (
                      <>
                        <EuiSplitPanel.Inner grow={false} key={idx}>
                          <EuiText size="m">
                            <p>{title}</p>
                          </EuiText>
                          <EuiSpacer size="s" />
                          {description && (
                            <EuiText size="s" color="subdued">
                              <p>{description}</p>
                            </EuiText>
                          )}
                        </EuiSplitPanel.Inner>
                        {idx + 1 < sectionAssetSavedObjects.length && (
                          <EuiHorizontalRule margin="none" />
                        )}
                      </>
                    ))}
                  </EuiSplitPanel.Outer>
                </>
              </EuiAccordion>
              <EuiSpacer size="l" />
            </>
          );
        })}
      </>
    );
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
