/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactEventHandler } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation, useParams, useHistory } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import styled from 'styled-components';
import {
  EuiBadge,
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import semverLt from 'semver/functions/lt';

import { getDeferredInstallationsCnt } from '../../../../../../services/has_deferred_installations';

import {
  getPackageReleaseLabel,
  isPackagePrerelease,
  splitPkgKey,
  packageToPackagePolicyInputs,
} from '../../../../../../../common/services';
import { HIDDEN_API_REFERENCE_PACKAGES } from '../../../../../../../common/constants';

import {
  useGetPackageInstallStatus,
  useSetPackageInstallStatus,
  useUIExtension,
  useBreadcrumbs,
  useStartServices,
  useAuthz,
  usePermissionCheckQuery,
  useIntegrationsStateContext,
  useGetSettingsQuery,
} from '../../../../hooks';
import { INTEGRATIONS_ROUTING_PATHS } from '../../../../constants';
import { ExperimentalFeaturesService } from '../../../../services';
import {
  useGetPackageInfoByKeyQuery,
  useLink,
  useAgentPolicyContext,
  useIsGuidedOnboardingActive,
} from '../../../../hooks';
import { pkgKeyFromPackageInfo } from '../../../../services';
import type { PackageInfo } from '../../../../types';
import { InstallStatus } from '../../../../types';
import {
  Error,
  Loading,
  HeaderReleaseBadge,
  WithGuidedOnboardingTour,
} from '../../../../components';
import type { WithHeaderLayoutProps } from '../../../../layouts';
import { WithHeaderLayout } from '../../../../layouts';

import { PermissionsError } from '../../../../../fleet/layouts';

import { DeferredAssetsWarning } from './assets/deferred_assets_warning';
import { useIsFirstTimeAgentUserQuery } from './hooks';
import { getInstallPkgRouteOptions } from './utils';
import {
  BackLink,
  IntegrationAgentPolicyCount,
  UpdateIcon,
  IconPanel,
  LoadingIconPanel,
  AddIntegrationButton,
} from './components';
import { AssetsPage } from './assets';
import { OverviewPage } from './overview';
import { PackagePoliciesPage } from './policies';
import { SettingsPage } from './settings';
import { CustomViewPage } from './custom';
import { DocumentationPage, hasDocumentation } from './documentation';
import { Configs } from './configs';

import './index.scss';
import type { InstallPkgRouteOptions } from './utils/get_install_route_options';
import { InstallButton } from './settings/install_button';

export type DetailViewPanelName =
  | 'overview'
  | 'policies'
  | 'assets'
  | 'settings'
  | 'custom'
  | 'api-reference'
  | 'configs';

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
  const { getFromIntegrations } = useIntegrationsStateContext();
  const { pkgkey, panel } = useParams<DetailParams>();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const { pathname, search, hash } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const integration = useMemo(() => queryParams.get('integration'), [queryParams]);
  const prerelease = useMemo(() => Boolean(queryParams.get('prerelease')), [queryParams]);
  /** Users from Security Solution onboarding page will have onboardingLink and onboardingAppId in the query params
   ** to redirect back to the onboarding page after adding an integration
   */
  const onboardingLink = useMemo(() => queryParams.get('onboardingLink'), [queryParams]);
  const onboardingAppId = useMemo(() => queryParams.get('onboardingAppId'), [queryParams]);

  const authz = useAuthz();
  const canAddAgent = authz.fleet.addAgents;
  const canInstallPackages = authz.integrations.installPackages;
  const canReadPackageSettings = authz.integrations.readPackageSettings;
  const canReadIntegrationPolicies = authz.integrations.readIntegrationPolicies;

  const {
    data: permissionCheck,
    error: permissionCheckError,
    isLoading: isPermissionCheckLoading,
  } = usePermissionCheckQuery();
  const missingSecurityConfiguration =
    !permissionCheck?.success && permissionCheckError === 'MISSING_SECURITY';
  const userCanInstallPackages = canInstallPackages && permissionCheck?.success;

  const services = useStartServices();
  const isCloud = !!services?.cloud?.cloudId;
  const { createPackagePolicyMultiPageLayout: isExperimentalAddIntegrationPageEnabled } =
    ExperimentalFeaturesService.get();
  const agentPolicyIdFromContext = getAgentPolicyId();
  const isOverviewPage = panel === 'overview';

  // Package info state
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const setPackageInstallStatus = useSetPackageInstallStatus();
  const getPackageInstallStatus = useGetPackageInstallStatus();

  const CustomAssets = useUIExtension(packageInfo?.name ?? '', 'package-detail-assets');

  const packageInstallStatus = useMemo(() => {
    if (packageInfo === null || !packageInfo.name) {
      return undefined;
    }
    return getPackageInstallStatus(packageInfo?.name)?.status;
  }, [packageInfo, getPackageInstallStatus]);
  const isInstalled = useMemo(
    () =>
      packageInstallStatus === InstallStatus.installed ||
      packageInstallStatus === InstallStatus.reinstalling,
    [packageInstallStatus]
  );

  const updateAvailable =
    packageInfo &&
    'installationInfo' in packageInfo &&
    packageInfo.installationInfo?.version &&
    semverLt(packageInfo.installationInfo.version, packageInfo.latestVersion);

  const [prereleaseIntegrationsEnabled, setPrereleaseIntegrationsEnabled] = React.useState<
    boolean | undefined
  >();

  const { data: settings, isInitialLoading: isSettingsInitialLoading } = useGetSettingsQuery({
    enabled: authz.fleet.readSettings,
  });

  useEffect(() => {
    const isEnabled = Boolean(settings?.item.prerelease_integrations_enabled) || prerelease;
    setPrereleaseIntegrationsEnabled(isEnabled);
  }, [settings?.item.prerelease_integrations_enabled, prerelease]);

  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: packageInfoLoading,
    isFetchedAfterMount: packageInfoIsFetchedAfterMount,
    refetch: refetchPackageInfo,
  } = useGetPackageInfoByKeyQuery(
    pkgName,
    pkgVersion,
    {
      prerelease: prereleaseIntegrationsEnabled,
      withMetadata: true,
    },
    {
      enabled: !authz.fleet.readSettings || !isSettingsInitialLoading, // Load only after settings are loaded
      refetchOnMount: 'always',
    }
  );

  const [latestGAVersion, setLatestGAVersion] = useState<string | undefined>();
  const [latestPrereleaseVersion, setLatestPrereleaseVersion] = useState<string | undefined>();

  // fetch latest GA version (prerelease=false)
  const { data: packageInfoLatestGAData } = useGetPackageInfoByKeyQuery(pkgName, '', {
    prerelease: false,
  });

  useEffect(() => {
    const pkg = packageInfoLatestGAData?.item;
    const isGAVersion = pkg && !isPackagePrerelease(pkg.version);
    if (isGAVersion) {
      setLatestGAVersion(pkg.version);
    }
  }, [packageInfoLatestGAData?.item]);

  // fetch latest Prerelease version (prerelease=true)
  const { data: packageInfoLatestPrereleaseData } = useGetPackageInfoByKeyQuery(pkgName, '', {
    prerelease: true,
  });

  useEffect(() => {
    setLatestPrereleaseVersion(packageInfoLatestPrereleaseData?.item.version);
  }, [packageInfoLatestPrereleaseData?.item.version]);

  const { isFirstTimeAgentUser = false, isLoading: firstTimeUserLoading } =
    useIsFirstTimeAgentUserQuery();
  const isGuidedOnboardingActive = useIsGuidedOnboardingActive(pkgName);

  // Refresh package info when status change
  const [oldPackageInstallStatus, setOldPackageStatus] = useState(packageInstallStatus);

  useEffect(() => {
    if (packageInstallStatus === 'not_installed') {
      setOldPackageStatus(packageInstallStatus);
    }
    if (oldPackageInstallStatus === 'not_installed' && packageInstallStatus === 'installed') {
      setOldPackageStatus(packageInstallStatus);
      refetchPackageInfo();
    }
  }, [packageInstallStatus, oldPackageInstallStatus, refetchPackageInfo]);

  const isLoading =
    packageInfoLoading ||
    isPermissionCheckLoading ||
    firstTimeUserLoading ||
    !packageInfoIsFetchedAfterMount;

  const showCustomTab =
    useUIExtension(packageInfoData?.item?.name ?? '', 'package-detail-custom') !== undefined;

  // Only show config tab if package has `inputs`
  const showConfigTab =
    canAddAgent && (packageInfo ? packageToPackagePolicyInputs(packageInfo).length > 0 : false);

  // Only show API references tab if it is allowed & has documentation to show
  const showDocumentationTab =
    !HIDDEN_API_REFERENCE_PACKAGES.includes(pkgName) &&
    packageInfo &&
    hasDocumentation({ packageInfo, integration });

  // Track install status state
  useEffect(() => {
    if (packageInfoIsFetchedAfterMount && packageInfoData?.item) {
      const packageInfoResponse = packageInfoData.item;
      setPackageInfo(packageInfoResponse);

      let installedVersion;
      const { name } = packageInfoData.item;
      if ('installationInfo' in packageInfoResponse) {
        installedVersion = packageInfoResponse.installationInfo?.version;
      }
      const status: InstallStatus = packageInfoResponse?.status as any;
      if (name) {
        setPackageInstallStatus({ name, status, version: installedVersion || null });
      }
    }
  }, [packageInfoData, packageInfoIsFetchedAfterMount, setPackageInstallStatus, setPackageInfo]);

  const integrationInfo = useMemo(
    () =>
      integration
        ? packageInfo?.policy_templates?.find(
            (policyTemplate) => policyTemplate.name === integration
          )
        : undefined,
    [integration, packageInfo]
  );

  const fromIntegrations = getFromIntegrations();

  const href =
    fromIntegrations === 'updates_available'
      ? getHref('integrations_installed_updates_available')
      : fromIntegrations === 'installed'
      ? getHref('integrations_installed')
      : getHref('integrations_all');

  const numOfDeferredInstallations = useMemo(
    () => getDeferredInstallationsCnt(packageInfo),
    [packageInfo]
  );

  const headerLeftContent = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="headerLeft">
        <EuiFlexItem>
          {/* Allows button to break out of full width */}
          <div>
            <BackLink queryParams={queryParams} href={href} />
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
            <FlexItemWithMinWidth grow={true}>
              <EuiFlexGroup direction="column" justifyContent="flexStart" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    {/* Render space in place of package name while package info loads to prevent layout from jumping around */}
                    <h1>{integrationInfo?.title || packageInfo?.title || '\u00A0'}</h1>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    {packageInfo?.type === 'content' ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="default">
                          {i18n.translate('xpack.fleet.epm.contentPackageBadgeLabel', {
                            defaultMessage: 'Content only',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="default">
                          {i18n.translate('xpack.fleet.epm.elasticAgentBadgeLabel', {
                            defaultMessage: 'Elastic Agent',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {packageInfo?.release && packageInfo.release !== 'ga' ? (
                      <EuiFlexItem grow={false}>
                        <HeaderReleaseBadge release={getPackageReleaseLabel(packageInfo.version)} />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </FlexItemWithMinWidth>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [integrationInfo, isLoading, packageInfo, href, queryParams]
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

      const defaultNavigateOptions: InstallPkgRouteOptions = getInstallPkgRouteOptions({
        agentPolicyId: agentPolicyIdFromContext,
        currentPath,
        integration,
        isCloud,
        isExperimentalAddIntegrationPageEnabled,
        isFirstTimeAgentUser,
        isGuidedOnboardingActive,
        pkgkey,
      });

      /** Users from Security Solution onboarding page will have onboardingLink and onboardingAppId in the query params
       ** to redirect back to the onboarding page after adding an integration
       */
      const navigateOptions: InstallPkgRouteOptions =
        onboardingAppId && onboardingLink
          ? [
              defaultNavigateOptions[0],
              {
                ...defaultNavigateOptions[1],
                state: {
                  ...(defaultNavigateOptions[1]?.state ?? {}),
                  onCancelNavigateTo: [onboardingAppId, { path: onboardingLink }],
                  onCancelUrl: onboardingLink,
                  onSaveNavigateTo: [onboardingAppId, { path: onboardingLink }],
                },
              },
            ]
          : defaultNavigateOptions;

      services.application.navigateToApp(...navigateOptions);
    },
    [
      agentPolicyIdFromContext,
      hash,
      history,
      integration,
      isCloud,
      isExperimentalAddIntegrationPageEnabled,
      isFirstTimeAgentUser,
      isGuidedOnboardingActive,
      onboardingAppId,
      onboardingLink,
      pathname,
      pkgkey,
      search,
      services.application,
    ]
  );

  const showVersionSelect = useMemo(
    () =>
      prereleaseIntegrationsEnabled &&
      latestGAVersion &&
      latestPrereleaseVersion &&
      latestGAVersion !== latestPrereleaseVersion &&
      (!packageInfo?.version ||
        packageInfo.version === latestGAVersion ||
        packageInfo.version === latestPrereleaseVersion),
    [prereleaseIntegrationsEnabled, latestGAVersion, latestPrereleaseVersion, packageInfo?.version]
  );

  const versionOptions = useMemo(
    () => [
      {
        value: latestPrereleaseVersion,
        text: latestPrereleaseVersion,
      },
      {
        value: latestGAVersion,
        text: latestGAVersion,
      },
    ],
    [latestPrereleaseVersion, latestGAVersion]
  );

  const versionLabel = i18n.translate('xpack.fleet.epm.versionLabel', {
    defaultMessage: 'Version',
  });

  const onVersionChange = useCallback(
    (version: string, packageName: string) => {
      const path = getPath('integration_details_overview', {
        pkgkey: `${packageName}-${version}`,
      });
      history.push(path);
    },
    [getPath, history]
  );

  const headerRightContent = useMemo(
    () =>
      packageInfo ? (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd" direction="row">
            {[
              {
                label: showVersionSelect ? undefined : versionLabel,
                content: (
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      {showVersionSelect ? (
                        <EuiSelect
                          data-test-subj="versionSelect"
                          prepend={versionLabel}
                          options={versionOptions}
                          value={packageInfo.version}
                          onChange={(event) =>
                            onVersionChange(event.target.value, packageInfo.name)
                          }
                        />
                      ) : (
                        <div data-test-subj="versionText">{packageInfo.version}</div>
                      )}
                    </EuiFlexItem>
                    {updateAvailable ? (
                      <EuiFlexItem grow={false}>
                        <UpdateIcon />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                ),
              },
              ...(isInstalled && packageInfo.type !== 'content'
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
              ...(packageInfo.type === 'content'
                ? !isInstalled
                  ? [{ isDivider: true }, { content: <InstallButton {...packageInfo} /> }]
                  : [] // if content package is already installed, don't show install button in header
                : [
                    { isDivider: true },
                    {
                      content: (
                        <WithGuidedOnboardingTour
                          packageKey={pkgkey}
                          tourType={'addIntegrationButton'}
                          isTourVisible={isOverviewPage && isGuidedOnboardingActive}
                          tourOffset={10}
                        >
                          <AddIntegrationButton
                            userCanInstallPackages={userCanInstallPackages}
                            href={getHref('add_integration_to_policy', {
                              pkgkey,
                              ...(integration ? { integration } : {}),
                              ...(agentPolicyIdFromContext
                                ? { agentPolicyId: agentPolicyIdFromContext }
                                : {}),
                            })}
                            missingSecurityConfiguration={missingSecurityConfiguration}
                            packageName={integrationInfo?.title || packageInfo.title}
                            onClick={handleAddIntegrationPolicyClick}
                          />
                        </WithGuidedOnboardingTour>
                      ),
                    },
                  ]),
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
      isInstalled,
      pkgkey,
      isOverviewPage,
      isGuidedOnboardingActive,
      userCanInstallPackages,
      getHref,
      integration,
      agentPolicyIdFromContext,
      missingSecurityConfiguration,
      integrationInfo?.title,
      handleAddIntegrationPolicyClick,
      onVersionChange,
      showVersionSelect,
      versionLabel,
      versionOptions,
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

    if (canReadIntegrationPolicies && isInstalled && packageInfo.type !== 'content') {
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

    if (isInstalled && (packageInfo.assets || CustomAssets)) {
      tabs.push({
        id: 'assets',
        name: (
          <div style={{ display: 'flex', textAlign: 'center' }}>
            <FormattedMessage
              id="xpack.fleet.epm.packageDetailsNav.packageAssetsLinkText"
              defaultMessage="Assets"
            />
            &nbsp;
            {numOfDeferredInstallations > 0 ? (
              <DeferredAssetsWarning numOfDeferredInstallations={numOfDeferredInstallations} />
            ) : null}
          </div>
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

    if (canReadPackageSettings && showConfigTab) {
      tabs.push({
        id: 'configs',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.configsText"
            defaultMessage="Configs"
          />
        ),
        isSelected: panel === 'configs',
        'data-test-subj': `tab-configs`,
        href: getHref('integration_details_configs', {
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

    if (showDocumentationTab) {
      tabs.push({
        id: 'api-reference',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetailsNav.documentationLinkText"
            defaultMessage="API reference"
          />
        ),
        isSelected: panel === 'api-reference',
        'data-test-subj': `tab-api-reference`,
        href: getHref('integration_details_api_reference', {
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
    isInstalled,
    CustomAssets,
    canReadPackageSettings,
    showConfigTab,
    showCustomTab,
    showDocumentationTab,
    numOfDeferredInstallations,
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
          error={packageInfoError.message}
        />
      ) : isLoading || !packageInfo ? (
        <Loading />
      ) : (
        <Routes>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_overview}>
            <OverviewPage
              packageInfo={packageInfo}
              integrationInfo={integrationInfo}
              latestGAVersion={latestGAVersion}
            />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_settings}>
            <SettingsPage
              packageInfo={packageInfo}
              packageMetadata={packageInfoData?.metadata}
              startServices={services}
            />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_assets}>
            <AssetsPage packageInfo={packageInfo} refetchPackageInfo={refetchPackageInfo} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_configs}>
            <Configs packageInfo={packageInfo} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_policies}>
            {canReadIntegrationPolicies ? (
              <PackagePoliciesPage packageInfo={packageInfo} />
            ) : (
              <PermissionsError
                error="MISSING_PRIVILEGES"
                requiredFleetRole="Agent Policies Read and Integrations Read"
              />
            )}
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_custom}>
            <CustomViewPage packageInfo={packageInfo} />
          </Route>
          <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_api_reference}>
            <DocumentationPage packageInfo={packageInfo} integration={integrationInfo?.name} />
          </Route>
          <Redirect to={INTEGRATIONS_ROUTING_PATHS.integration_details_overview} />
        </Routes>
      )}
    </WithHeaderLayout>
  );
}
