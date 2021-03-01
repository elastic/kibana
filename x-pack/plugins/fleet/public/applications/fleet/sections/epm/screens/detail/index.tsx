/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUIExtension } from '../../../../hooks/use_ui_extension';
import { PAGE_ROUTING_PATHS, PLUGIN_ID } from '../../../../constants';
import { useCapabilities, useGetPackageInfoByKey, useLink } from '../../../../hooks';
import { pkgKeyFromPackageInfo } from '../../../../services/pkg_key_from_package_info';
import {
  CreatePackagePolicyRouteState,
  DetailViewPanelName,
  InstallStatus,
  PackageInfo,
} from '../../../../types';
import { Error, Loading } from '../../../../components';
import { useBreadcrumbs } from '../../../../hooks';
import { WithHeaderLayout, WithHeaderLayoutProps } from '../../../../layouts';
import { RELEASE_BADGE_DESCRIPTION, RELEASE_BADGE_LABEL } from '../../components/release_badge';
import { useSetPackageInstallStatus } from '../../hooks';
import { IntegrationAgentPolicyCount, UpdateIcon, IconPanel, LoadingIconPanel } from './components';
import { OverviewPage } from './overview';
import { PackagePoliciesPage } from './policies';
import { SettingsPage } from './settings';
import { CustomViewPage } from './custom';
import './index.scss';

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
  useBreadcrumbs('integration_details_overview', { pkgTitle: packageTitle });
  return null;
}

export function Detail() {
  const { pkgkey, panel } = useParams<DetailParams>();
  const { getHref, getPath } = useLink();
  const hasWriteCapabilites = useCapabilities().write;
  const history = useHistory();
  const location = useLocation();

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

  const packageInstallStatus = packageInfoData?.response.status;
  const showCustomTab =
    useUIExtension(packageInfoData?.response.name ?? '', 'package-detail-custom') !== undefined;

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
                id="xpack.fleet.epm.browseAllButtonText"
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

  const handleAddIntegrationPolicyClick = useCallback<ReactEventHandler>(
    (ev) => {
      ev.preventDefault();

      // The object below, given to `createHref` is explicitly accessing keys of `location` in order
      // to ensure that dependencies to this `useCallback` is set correctly (because `location` is mutable)
      const currentPath = history.createHref({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      });
      const redirectToPath: CreatePackagePolicyRouteState['onSaveNavigateTo'] &
        CreatePackagePolicyRouteState['onCancelNavigateTo'] = [
        PLUGIN_ID,
        {
          path: currentPath,
        },
      ];
      const redirectBackRouteState: CreatePackagePolicyRouteState = {
        onSaveNavigateTo: redirectToPath,
        onCancelNavigateTo: redirectToPath,
        onCancelUrl: currentPath,
      };

      history.push({
        pathname: getPath('add_integration_to_policy', {
          pkgkey,
        }),
        state: redirectBackRouteState,
      });
    },
    [getPath, history, location.hash, location.pathname, location.search, pkgkey]
  );

  const headerRightContent = useMemo(
    () =>
      packageInfo ? (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd" direction="row">
            {[
              {
                label: i18n.translate('xpack.fleet.epm.versionLabel', {
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
              ...(packageInstallStatus === 'installed'
                ? [
                    { isDivider: true },
                    {
                      label: i18n.translate('xpack.fleet.epm.usedByLabel', {
                        defaultMessage: 'Agent policies',
                      }),
                      'data-test-subj': 'agentPolicyCount',
                      content: <IntegrationAgentPolicyCount packageName={packageInfo.name} />,
                    },
                  ]
                : []),
              { isDivider: true },
              {
                content: (
                  // eslint-disable-next-line @elastic/eui/href-or-on-click
                  <EuiButton
                    fill
                    isDisabled={!hasWriteCapabilites}
                    iconType="plusInCircle"
                    href={getHref('add_integration_to_policy', {
                      pkgkey,
                    })}
                    onClick={handleAddIntegrationPolicyClick}
                    data-test-subj="addIntegrationPolicyButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.epm.addPackagePolicyButtonText"
                      defaultMessage="Add {packageName}"
                      values={{
                        packageName: packageInfo.title,
                      }}
                    />
                  </EuiButton>
                ),
              },
            ].map((item, index) => (
              <EuiFlexItem grow={false} key={index} data-test-subj={item['data-test-subj']}>
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
    [
      getHref,
      handleAddIntegrationPolicyClick,
      hasWriteCapabilites,
      packageInfo,
      packageInstallStatus,
      pkgkey,
      updateAvailable,
    ]
  );

  const headerTabs = useMemo<WithHeaderLayoutProps['tabs']>(() => {
    if (!packageInfo) {
      return [];
    }
    const packageInfoKey = pkgKeyFromPackageInfo(packageInfo);

    const tabs: WithHeaderLayoutProps['tabs'] = [
      {
        id: 'overview',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.overviewLinkText"
            defaultMessage="Overview"
          />
        ),
        isSelected: panel === 'overview',
        'data-test-subj': `tab-overview`,
        href: getHref('integration_details_overview', {
          pkgkey: packageInfoKey,
        }),
      },
    ];

    if (packageInstallStatus === InstallStatus.installed) {
      tabs.push({
        id: 'policies',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.packagePoliciesLinkText"
            defaultMessage="Policies"
          />
        ),
        isSelected: panel === 'policies',
        'data-test-subj': `tab-policies`,
        href: getHref('integration_details_policies', {
          pkgkey: packageInfoKey,
        }),
      });
    }

    tabs.push({
      id: 'settings',
      name: (
        <FormattedMessage
          id="xpack.fleet.epm.packageDetailsNav.settingsLinkText"
          defaultMessage="Settings"
        />
      ),
      isSelected: panel === 'settings',
      'data-test-subj': `tab-settings`,
      href: getHref('integration_details_settings', {
        pkgkey: packageInfoKey,
      }),
    });

    if (showCustomTab) {
      tabs.push({
        id: 'custom',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.packageCustomLinkText"
            defaultMessage="Advanced"
          />
        ),
        isSelected: panel === 'custom',
        'data-test-subj': `tab-custom`,
        href: getHref('integration_details_custom', {
          pkgkey: packageInfoKey,
        }),
      });
    }

    return tabs;
  }, [getHref, packageInfo, panel, showCustomTab, packageInstallStatus]);

  return (
    <WithHeaderLayout
      leftColumn={headerLeftContent}
      rightColumn={headerRightContent}
      rightColumnGrow={false}
      tabs={headerTabs}
      tabsClassName="fleet__epm__shiftNavTabs"
    >
      {packageInfo ? <Breadcrumbs packageTitle={packageInfo.title} /> : null}
      {packageInfoError ? (
        <Error
          title={
            <FormattedMessage
              id="xpack.fleet.epm.loadingIntegrationErrorTitle"
              defaultMessage="Error loading integration details"
            />
          }
          error={packageInfoError}
        />
      ) : isLoading || !packageInfo ? (
        <Loading />
      ) : (
        <Switch>
          <Route path={PAGE_ROUTING_PATHS.integration_details_overview}>
            <OverviewPage packageInfo={packageInfo} />
          </Route>
          <Route path={PAGE_ROUTING_PATHS.integration_details_settings}>
            <SettingsPage packageInfo={packageInfo} />
          </Route>
          <Route path={PAGE_ROUTING_PATHS.integration_details_policies}>
            <PackagePoliciesPage name={packageInfo.name} version={packageInfo.version} />
          </Route>
          <Route path={PAGE_ROUTING_PATHS.integration_details_custom}>
            <CustomViewPage packageInfo={packageInfo} />
          </Route>
          <Redirect to={PAGE_ROUTING_PATHS.integration_details_overview} />
        </Switch>
      )}
    </WithHeaderLayout>
  );
}
