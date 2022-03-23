/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactEventHandler } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, Route, Switch, useLocation, useParams, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import type { EuiToolTipProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import semverLt from 'semver/functions/lt';

import { splitPkgKey } from '../../../../../../../common';
import {
  useGetPackageInstallStatus,
  useSetPackageInstallStatus,
  useUIExtension,
  useBreadcrumbs,
  useStartServices,
  useAuthz,
  usePermissionCheck,
} from '../../../../hooks';
import {
  PLUGIN_ID,
  INTEGRATIONS_PLUGIN_ID,
  INTEGRATIONS_ROUTING_PATHS,
  pagePathGetters,
} from '../../../../constants';
import { useGetPackageInfoByKey, useLink, useAgentPolicyContext } from '../../../../hooks';
import { pkgKeyFromPackageInfo } from '../../../../services';
import type {
  CreatePackagePolicyRouteState,
  DetailViewPanelName,
  PackageInfo,
} from '../../../../types';
import { InstallStatus } from '../../../../types';
import { Error, Loading } from '../../../../components';
import type { WithHeaderLayoutProps } from '../../../../layouts';
import { WithHeaderLayout } from '../../../../layouts';
import { RELEASE_BADGE_DESCRIPTION, RELEASE_BADGE_LABEL } from '../../components/release_badge';

import { IntegrationAgentPolicyCount, UpdateIcon, IconPanel, LoadingIconPanel } from './components';
import { AssetsPage } from './assets';
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

// to limit size of iconpanel, making the header too big
const FlexItemWithMaxHeight = styled(EuiFlexItem)`
  @media (min-width: 768px) {
    max-height: 60px;
  }
`;

function Breadcrumbs({ packageTitle }: { packageTitle: string }) {
  useBreadcrumbs('integration_details_overview', { pkgTitle: packageTitle });
  return null;
}

export function Detail() {
  const { getId: getAgentPolicyId } = useAgentPolicyContext();
  const { pkgkey, panel } = useParams<DetailParams>();
  const { getHref } = useLink();
  const canInstallPackages = useAuthz().integrations.installPackages;
  const canReadPackageSettings = useAuthz().integrations.readPackageSettings;
  const canReadIntegrationPolicies = useAuthz().integrations.readIntegrationPolicies;
  const permissionCheck = usePermissionCheck();
  const missingSecurityConfiguration =
    !permissionCheck.data?.success && permissionCheck.data?.error === 'MISSING_SECURITY';
  const userCanInstallPackages = canInstallPackages && permissionCheck.data?.success;
  const history = useHistory();
  const { pathname, search, hash } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const integration = useMemo(() => queryParams.get('integration'), [queryParams]);
  const services = useStartServices();
  const agentPolicyIdFromContext = getAgentPolicyId();

  // Package info state
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const setPackageInstallStatus = useSetPackageInstallStatus();
  const getPackageInstallStatus = useGetPackageInstallStatus();

  const CustomAssets = useUIExtension(packageInfo?.name ?? '', 'package-detail-assets');

  const packageInstallStatus = useMemo(() => {
    if (packageInfo === null || !packageInfo.name) {
      return undefined;
    }
    return getPackageInstallStatus(packageInfo.name).status;
  }, [packageInfo, getPackageInstallStatus]);

  const updateAvailable =
    packageInfo &&
    'savedObject' in packageInfo &&
    packageInfo.savedObject &&
    semverLt(packageInfo.savedObject.attributes.version, packageInfo.latestVersion);

  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: packageInfoLoading,
    isInitialRequest: packageIsInitialRequest,
    resendRequest: refreshPackageInfo,
  } = useGetPackageInfoByKey(pkgName, pkgVersion);

  // Refresh package info when status change
  const [oldPackageInstallStatus, setOldPackageStatus] = useState(packageInstallStatus);

  useEffect(() => {
    if (packageInstallStatus === 'not_installed') {
      setOldPackageStatus(packageInstallStatus);
    }
    if (oldPackageInstallStatus === 'not_installed' && packageInstallStatus === 'installed') {
      setOldPackageStatus(packageInstallStatus);
      refreshPackageInfo();
    }
  }, [packageInstallStatus, oldPackageInstallStatus, refreshPackageInfo]);

  const isLoading = (packageInfoLoading && !packageIsInitialRequest) || permissionCheck.isLoading;

  const showCustomTab =
    useUIExtension(packageInfoData?.item.name ?? '', 'package-detail-custom') !== undefined;

  // Track install status state
  useEffect(() => {
    if (packageInfoData?.item) {
      const packageInfoResponse = packageInfoData.item;
      setPackageInfo(packageInfoResponse);

      let installedVersion;
      const { name } = packageInfoData.item;
      if ('savedObject' in packageInfoResponse) {
        installedVersion = packageInfoResponse.savedObject.attributes.version;
      }
      const status: InstallStatus = packageInfoResponse?.status as any;
      if (name) {
        setPackageInstallStatus({ name, status, version: installedVersion || null });
      }
    }
  }, [packageInfoData, setPackageInstallStatus, setPackageInfo]);

  const integrationInfo = useMemo(
    () =>
      integration
        ? packageInfo?.policy_templates?.find(
            (policyTemplate) => policyTemplate.name === integration
          )
        : undefined,
    [integration, packageInfo]
  );

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
            <FlexItemWithMaxHeight grow={false}>
              {isLoading || !packageInfo ? (
                <LoadingIconPanel />
              ) : (
                <IconPanel
                  packageName={packageInfo.name}
                  integrationName={integrationInfo?.name}
                  version={packageInfo.version}
                  icons={integrationInfo?.icons || packageInfo.icons}
                />
              )}
            </FlexItemWithMaxHeight>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <FlexItemWithMinWidth grow={true}>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText>
                        {/* Render space in place of package name while package info loads to prevent layout from jumping around */}
                        <h1>{integrationInfo?.title || packageInfo?.title || '\u00A0'}</h1>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="default">
                        {i18n.translate('xpack.fleet.epm.elasticAgentBadgeLabel', {
                          defaultMessage: 'Elastic Agent',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
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
    [getHref, integrationInfo, isLoading, packageInfo]
  );

  const handleAddIntegrationPolicyClick = useCallback<ReactEventHandler>(
    (ev) => {
      ev.preventDefault();

      // The object below, given to `createHref` is explicitly accessing keys of `location` in order
      // to ensure that dependencies to this `useCallback` is set correctly (because `location` is mutable)
      const currentPath = history.createHref({
        pathname,
        search,
        hash,
      });

      const path = pagePathGetters.add_integration_to_policy({
        pkgkey,
        ...(integration ? { integration } : {}),
        ...(agentPolicyIdFromContext ? { agentPolicyId: agentPolicyIdFromContext } : {}),
      })[1];

      let redirectToPath: CreatePackagePolicyRouteState['onSaveNavigateTo'] &
        CreatePackagePolicyRouteState['onCancelNavigateTo'];
      let onSaveQueryParams: CreatePackagePolicyRouteState['onSaveQueryParams'];
      if (agentPolicyIdFromContext) {
        redirectToPath = [
          PLUGIN_ID,
          {
            path: pagePathGetters.policy_details({
              policyId: agentPolicyIdFromContext,
            })[1],
          },
        ];

        onSaveQueryParams = {
          showAddAgentHelp: true,
          openEnrollmentFlyout: true,
        };
      } else {
        redirectToPath = [
          INTEGRATIONS_PLUGIN_ID,
          {
            path: pagePathGetters.integration_details_policies({
              pkgkey,
              ...(integration ? { integration } : {}),
            })[1],
          },
        ];

        onSaveQueryParams = {
          showAddAgentHelp: { renameKey: 'showAddAgentHelpForPolicyId', policyIdAsValue: true },
          openEnrollmentFlyout: { renameKey: 'addAgentToPolicyId', policyIdAsValue: true },
        };
      }

      const redirectBackRouteState: CreatePackagePolicyRouteState = {
        onSaveNavigateTo: redirectToPath,
        onSaveQueryParams,
        onCancelNavigateTo: [
          INTEGRATIONS_PLUGIN_ID,
          {
            path: pagePathGetters.integration_details_overview({
              pkgkey,
              ...(integration ? { integration } : {}),
            })[1],
          },
        ],
        onCancelUrl: currentPath,
      };

      services.application.navigateToApp(PLUGIN_ID, {
        path,
        state: redirectBackRouteState,
      });
    },
    [
      history,
      hash,
      pathname,
      search,
      pkgkey,
      integration,
      services.application,
      agentPolicyIdFromContext,
    ]
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
                      <EuiFlexItem grow={false}>
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
                  <EuiButtonWithTooltip
                    fill
                    isDisabled={!userCanInstallPackages}
                    iconType="plusInCircle"
                    href={getHref('add_integration_to_policy', {
                      pkgkey,
                      ...(integration ? { integration } : {}),
                      ...(agentPolicyIdFromContext
                        ? { agentPolicyId: agentPolicyIdFromContext }
                        : {}),
                    })}
                    onClick={handleAddIntegrationPolicyClick}
                    data-test-subj="addIntegrationPolicyButton"
                    tooltip={
                      !userCanInstallPackages
                        ? {
                            content: missingSecurityConfiguration ? (
                              <FormattedMessage
                                id="xpack.fleet.epm.addPackagePolicyButtonSecurityRequiredTooltip"
                                defaultMessage="To add Elastic Agent Integrations, you must have security enabled and have the All privilege for Fleet. Contact your administrator."
                              />
                            ) : (
                              <FormattedMessage
                                id="xpack.fleet.epm.addPackagePolicyButtonPrivilegesRequiredTooltip"
                                defaultMessage="Elastic Agent Integrations require the All privilege for Fleet and All privilege for Integrations. Contact your administrator."
                              />
                            ),
                          }
                        : undefined
                    }
                  >
                    <FormattedMessage
                      id="xpack.fleet.epm.addPackagePolicyButtonText"
                      defaultMessage="Add {packageName}"
                      values={{
                        packageName: integrationInfo?.title || packageInfo.title,
                      }}
                    />
                  </EuiButtonWithTooltip>
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
      packageInfo,
      updateAvailable,
      packageInstallStatus,
      userCanInstallPackages,
      getHref,
      pkgkey,
      integration,
      agentPolicyIdFromContext,
      handleAddIntegrationPolicyClick,
      missingSecurityConfiguration,
      integrationInfo?.title,
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
          ...(integration ? { integration } : {}),
        }),
      },
    ];

    if (canReadIntegrationPolicies && packageInstallStatus === InstallStatus.installed) {
      tabs.push({
        id: 'policies',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.packagePoliciesLinkText"
            defaultMessage="Integration policies"
          />
        ),
        isSelected: panel === 'policies',
        'data-test-subj': `tab-policies`,
        href: getHref('integration_details_policies', {
          pkgkey: packageInfoKey,
          ...(integration ? { integration } : {}),
        }),
      });
    }

    if (packageInstallStatus === InstallStatus.installed && (packageInfo.assets || CustomAssets)) {
      tabs.push({
        id: 'assets',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.packageAssetsLinkText"
            defaultMessage="Assets"
          />
        ),
        isSelected: panel === 'assets',
        'data-test-subj': `tab-assets`,
        href: getHref('integration_details_assets', {
          pkgkey: packageInfoKey,
          ...(integration ? { integration } : {}),
        }),
      });
    }

    if (canReadPackageSettings) {
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
          ...(integration ? { integration } : {}),
        }),
      });
    }

    if (canReadPackageSettings && showCustomTab) {
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
          ...(integration ? { integration } : {}),
        }),
      });
    }

    return tabs;
  }, [
    packageInfo,
    panel,
    getHref,
    integration,
    canReadIntegrationPolicies,
    canReadPackageSettings,
    packageInstallStatus,
    CustomAssets,
    showCustomTab,
  ]);

  const securityCallout = missingSecurityConfiguration ? (
    <>
      <EuiCallOut
        color="warning"
        iconType="lock"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsSecurityRequiredCalloutTitle"
            defaultMessage="Security needs to be enabled in order to add Elastic Agent integrations"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.epm.packageDetailsSecurityRequiredCalloutDescription"
          defaultMessage="In order to fully use Fleet, you must enable Elasticsearch and Kibana security features.
        Follow the {guideLink} to enable security."
          values={{
            guideLink: (
              <a href={services.http.basePath.prepend('/app/fleet')}>
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetailsSecurityRequiredCalloutDescriptionGuideLink"
                  defaultMessage="steps in this guide"
                />
              </a>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer />
    </>
  ) : undefined;

  return (
    <WithHeaderLayout
      leftColumn={headerLeftContent}
      rightColumn={headerRightContent}
      rightColumnGrow={false}
      topContent={securityCallout}
      tabs={headerTabs}
      tabsClassName="fleet__epm__shiftNavTabs"
    >
      {integrationInfo || packageInfo ? (
        <Breadcrumbs packageTitle={integrationInfo?.title || packageInfo?.title || ''} />
      ) : null}
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
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_overview}>
            <OverviewPage packageInfo={packageInfo} integrationInfo={integrationInfo} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_settings}>
            <SettingsPage packageInfo={packageInfo} theme$={services.theme.theme$} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_assets}>
            <AssetsPage packageInfo={packageInfo} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_policies}>
            <PackagePoliciesPage name={packageInfo.name} version={packageInfo.version} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_custom}>
            <CustomViewPage packageInfo={packageInfo} />
          </Route>
          <Redirect to={INTEGRATIONS_ROUTING_PATHS.integration_details_overview} />
        </Switch>
      )}
    </WithHeaderLayout>
  );
}

type EuiButtonPropsFull = Parameters<typeof EuiButton>[0];

export const EuiButtonWithTooltip: React.FC<
  EuiButtonPropsFull & { tooltip?: Partial<EuiToolTipProps> }
> = ({ tooltip: tooltipProps, ...buttonProps }) => {
  return tooltipProps ? (
    <EuiToolTip {...tooltipProps}>
      <EuiButton {...buttonProps} />
    </EuiToolTip>
  ) : (
    <EuiButton {...buttonProps} />
  );
};
