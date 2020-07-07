/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiBetaBadge,
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { DetailViewPanelName, InstallStatus, PackageInfo } from '../../../../types';
import { Loading, Error } from '../../../../components';
import {
  useGetPackageInfoByKey,
  useBreadcrumbs,
  useLink,
  useCapabilities,
} from '../../../../hooks';
import { WithHeaderLayout } from '../../../../layouts';
import { useSetPackageInstallStatus } from '../../hooks';
import { IconPanel, LoadingIconPanel } from '../../components/icon_panel';
import { RELEASE_BADGE_LABEL, RELEASE_BADGE_DESCRIPTION } from '../../components/release_badge';
import { UpdateIcon } from '../../components/icons';
import { Content } from './content';

export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailParams {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

// Allows child text to be truncated
const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
`;

function Breadcrumbs({ packageTitle }: { packageTitle: string }) {
  useBreadcrumbs('integration_details', { pkgTitle: packageTitle });
  return null;
}

export function Detail() {
  // TODO: fix forced cast if possible
  const { pkgkey, panel = DEFAULT_PANEL } = useParams() as DetailParams;
  const { getHref } = useLink();
  const hasWriteCapabilites = useCapabilities().write;

  // Package info state
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const setPackageInstallStatus = useSetPackageInstallStatus();
  const updateAvailable =
    packageInfo &&
    'savedObject' in packageInfo &&
    packageInfo.savedObject &&
    packageInfo.savedObject.attributes.version < packageInfo.latestVersion;

  // Fetch package info
  const { data: packageInfoData, error: packageInfoError, isLoading } = useGetPackageInfoByKey(
    pkgkey
  );

  // Track install status state
  useEffect(() => {
    if (packageInfoData?.response) {
      const packageInfoResponse = packageInfoData.response;
      setPackageInfo(packageInfoResponse);

      let installedVersion;
      const { name } = packageInfoData.response;
      if ('savedObject' in packageInfoResponse) {
        installedVersion = packageInfoResponse.savedObject.attributes.version;
      }
      const status: InstallStatus = packageInfoResponse?.status as any;
      if (name) {
        setPackageInstallStatus({ name, status, version: installedVersion || null });
      }
    }
  }, [packageInfoData, setPackageInstallStatus, setPackageInfo]);

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          {/* Allows button to break out of full width */}
          <div>
            <EuiButtonEmpty
              iconType="arrowLeft"
              size="xs"
              flush="left"
              href={getHref('integrations_all')}
            >
              <FormattedMessage
                id="xpack.ingestManager.epm.browseAllButtonText"
                defaultMessage="Browse all integrations"
              />
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              {isLoading || !packageInfo ? (
                <LoadingIconPanel />
              ) : (
                <IconPanel
                  packageName={packageInfo.name}
                  version={packageInfo.version}
                  icons={packageInfo.icons}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m" className="eui-textTruncate">
                <FlexItemWithMinWidth grow={false}>
                  <EuiText>
                    {/* Render space in place of package name while package info loads to prevent layout from jumping around */}
                    <h1 className="eui-textTruncate">{packageInfo?.title || '\u00A0'}</h1>
                  </EuiText>
                </FlexItemWithMinWidth>
                {packageInfo?.release && packageInfo.release !== 'ga' ? (
                  <EuiFlexItem grow={false}>
                    <EuiBetaBadge
                      label={RELEASE_BADGE_LABEL[packageInfo.release]}
                      tooltipContent={RELEASE_BADGE_DESCRIPTION[packageInfo.release]}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [getHref, isLoading, packageInfo]
  );

  const headerRightContent = useMemo(
    () =>
      packageInfo ? (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd" direction="row">
            {[
              {
                label: i18n.translate('xpack.ingestManager.epm.versionLabel', {
                  defaultMessage: 'Version',
                }),
                content: (
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>{packageInfo.version}</EuiFlexItem>
                    {updateAvailable ? (
                      <EuiFlexItem>
                        <UpdateIcon />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                ),
              },
              { isDivider: true },
              {
                content: (
                  <EuiButton
                    fill
                    isDisabled={!hasWriteCapabilites}
                    iconType="plusInCircle"
                    href={getHref('add_integration_to_configuration', {
                      pkgkey,
                    })}
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.epm.addPackageConfigButtonText"
                      defaultMessage="Add {packageName}"
                      values={{
                        packageName: packageInfo.title,
                      }}
                    />
                  </EuiButton>
                ),
              },
            ].map((item, index) => (
              <EuiFlexItem grow={false} key={index}>
                {item.isDivider ?? false ? (
                  <Divider />
                ) : item.label ? (
                  <EuiDescriptionList className="eui-textRight" compressed textStyle="reverse">
                    <EuiDescriptionListTitle>{item.label}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>{item.content}</EuiDescriptionListDescription>
                  </EuiDescriptionList>
                ) : (
                  item.content
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : undefined,
    [getHref, hasWriteCapabilites, packageInfo, pkgkey, updateAvailable]
  );

  return (
    <WithHeaderLayout
      leftColumn={headerLeftContent}
      rightColumn={headerRightContent}
      rightColumnGrow={false}
    >
      {packageInfo ? <Breadcrumbs packageTitle={packageInfo.title} /> : null}
      {packageInfoError ? (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.epm.loadingIntegrationErrorTitle"
              defaultMessage="Error loading integration details"
            />
          }
          error={packageInfoError}
        />
      ) : isLoading || !packageInfo ? (
        <Loading />
      ) : (
        <Content {...packageInfo} panel={panel} />
      )}
    </WithHeaderLayout>
  );
}
