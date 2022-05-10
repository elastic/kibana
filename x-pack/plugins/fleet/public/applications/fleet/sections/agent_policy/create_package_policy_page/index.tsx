/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useMemo } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';

import type { AddToPolicyParams, EditPackagePolicyFrom } from './types';

import { dataTypes, FLEET_SYSTEM_PACKAGE, splitPkgKey } from '../../../../../../common';
import type {
  AgentPolicy,
  NewAgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
  CreatePackagePolicyRouteState,
  OnSaveQueryParamKeys,
} from '../../../types';
import {
  useLink,
  sendCreatePackagePolicy,
  useStartServices,
  useConfig,
  sendGetAgentStatus,
  useGetPackageInfoByKey,
  sendCreateAgentPolicy,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { agentPolicyFormValidation, ConfirmDeployAgentPolicyModal } from '../components';
import { useIntraAppState, useUIExtension } from '../../../hooks';
import { ExtensionWrapper } from '../../../components';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { pkgKeyFromPackageInfo } from '../../../services';

import {
  CreatePackagePolicyPageLayout,
  CreatePackagePolicyPageStepsLayout,
  PostInstallAddAgentModal,
  IntegrationBreadcrumb,
} from './components';
import type { EditPackagePolicyFrom, PackagePolicyFormState } from './types';
import type { PackagePolicyValidationResults } from './services';
import { validatePackagePolicy, validationHasErrors } from './services';
import { appendOnSaveQueryParamsToPath } from './utils';
import { StepConfigurePackagePolicy } from './step_configure_package';
import { StepDefinePackagePolicy } from './step_define_package_policy';
import { SelectedPolicyTab, StepSelectHosts } from './step_select_hosts';

const StepsWithLessPadding = styled(EuiSteps)`
  .euiStep__content {
    padding-bottom: ${(props) => props.theme.eui.paddingSizes.m};
  }

  // compensating for EuiBottomBar hiding the content
  @media (max-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    margin-bottom: 100px;
  }
`;

const CustomEuiBottomBar = styled(EuiBottomBar)`
  /* A relatively _low_ z-index value here to account for EuiComboBox popover that might appear under the bottom bar */
  z-index: 50;
`;

interface AddToPolicyParams {
  pkgkey: string;
  integration?: string;
  policyId?: string;
}

export const CreatePackagePolicyPage: React.FunctionComponent = () => {
  const {
    application: { navigateToApp },
    notifications,
  } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { params } = useRouteMatch<AddToPolicyParams>();
  const { getHref, getPath } = useLink();
  const history = useHistory();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();

export const CreatePackagePolicyPage: React.FC<{}> = () => {
  const { search } = useLocation();
  const { params } = useRouteMatch<AddToPolicyParams>();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const useMultiPageLayout = useMemo(() => queryParams.has('useMultiPageLayout'), [queryParams]);
  const queryParamsPolicyId = useMemo(
    () => queryParams.get('policyId') ?? undefined,
    [queryParams]
  );
  const useStepsLayout = useMemo(() => queryParams.has('useStepsLayout'), [queryParams]);

  /**
   * Please note: policyId can come from one of two sources. The URL param (in the URL path) or
   * in the query params (?policyId=foo).
   *
   * Either way, we take this as an indication that a user is "coming from" the fleet policy UI
   * since we link them out to packages (a.k.a. integrations) UI when choosing a new package. It is
   * no longer possible to choose a package directly in the create package form.
   *
   * We may want to deprecate the ability to pass in policyId from URL params since there is no package
   * creation possible if a user has not chosen one from the packages UI.
   */
  const from: EditPackagePolicyFrom =
    'policyId' in params || queryParamsPolicyId ? 'policy' : 'package';

  const pageParams = {
    from,
    queryParamsPolicyId,
  };

  if (useMultiPageLayout) {
    return <CreatePackagePolicyMultiPage {...pageParams} />;
  }

  const Cmp = useStepsLayout ? CreatePackagePolicyPageStepsLayout : CreatePackagePolicyPageLayout;
  return (
    <Cmp {...layoutProps} data-test-subj="createPackagePolicy">
      <EuiErrorBoundary>
        {formState === 'CONFIRM' && agentPolicy && (
          <ConfirmDeployAgentPolicyModal
            agentCount={agentCount}
            agentPolicy={agentPolicy}
            onConfirm={onSubmit}
            onCancel={() => setFormState('VALID')}
          />
        )}
        {formState === 'SUBMITTED_NO_AGENTS' && agentPolicy && packageInfo && (
          <PostInstallAddAgentModal
            packageInfo={packageInfo}
            agentPolicy={agentPolicy}
            onConfirm={() => navigateAddAgent(savedPackagePolicy)}
            onCancel={() => navigateAddAgentHelp(savedPackagePolicy)}
          />
        )}
        {packageInfo && (
          <IntegrationBreadcrumb
            pkgTitle={integrationInfo?.title || packageInfo.title}
            pkgkey={pkgKeyFromPackageInfo(packageInfo)}
            integration={integrationInfo?.name}
          />
        )}
        <StepsWithLessPadding steps={steps} />
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <CustomEuiBottomBar data-test-subj="integrationsBottomBar">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              {packageInfo && (formState === 'INVALID' || hasAgentPolicyError) ? (
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.errorOnSaveText"
                  defaultMessage="Your integration policy has errors. Please fix them before saving."
                />
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                  <EuiButtonEmpty
                    color="ghost"
                    href={cancelUrl}
                    onClick={cancelClickHandler}
                    data-test-subj="createPackagePolicyCancelButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.cancelButton"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={onSubmit}
                    isLoading={formState === 'LOADING'}
                    disabled={formState !== 'VALID' || hasAgentPolicyError || !validationResults}
                    iconType="save"
                    color="primary"
                    fill
                    data-test-subj="createPackagePolicySaveButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.saveButton"
                      defaultMessage="Save and continue"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </CustomEuiBottomBar>
      </EuiErrorBoundary>
    </Cmp>
  );
};
