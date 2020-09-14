/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { AgentPolicy, PackageInfo, UpdatePackagePolicy } from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  useCore,
  useConfig,
  sendUpdatePackagePolicy,
  sendGetAgentStatus,
  sendGetOneAgentPolicy,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicyPageLayout } from '../create_package_policy_page/components';
import {
  PackagePolicyValidationResults,
  validatePackagePolicy,
  validationHasErrors,
} from '../create_package_policy_page/services';
import {
  PackagePolicyFormState,
  CreatePackagePolicyFrom,
} from '../create_package_policy_page/types';
import { StepConfigurePackagePolicy } from '../create_package_policy_page/step_configure_package';
import { StepDefinePackagePolicy } from '../create_package_policy_page/step_define_package_policy';

export const EditPackagePolicyPage: React.FunctionComponent = () => {
  const {
    notifications,
    chrome: { getIsNavDrawerLocked$ },
    uiSettings,
  } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const {
    params: { policyId, packagePolicyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();
  const history = useHistory();
  const { getHref, getPath } = useLink();
  const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);

  useEffect(() => {
    const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
      setIsNavDrawerLocked(newIsNavDrawerLocked);
    });

    return () => subscription.unsubscribe();
  });

  // Agent policy, package info, and package policy states
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<Error>();
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [packagePolicy, setPackagePolicy] = useState<UpdatePackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    enabled: true,
    output_id: '',
    inputs: [],
    version: '',
  });

  // Retrieve agent policy, package, and package policy info
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const [{ data: agentPolicyData }, { data: packagePolicyData }] = await Promise.all([
          sendGetOneAgentPolicy(policyId),
          sendGetOnePackagePolicy(packagePolicyId),
        ]);
        if (agentPolicyData?.item) {
          setAgentPolicy(agentPolicyData.item);
        }
        if (packagePolicyData?.item) {
          const {
            id,
            revision,
            inputs,
            /* eslint-disable @typescript-eslint/naming-convention */
            created_by,
            created_at,
            updated_by,
            updated_at,
            /* eslint-enable @typescript-eslint/naming-convention */
            ...restOfPackagePolicy
          } = packagePolicyData.item;
          // Remove `compiled_stream` from all stream info, we assign this after saving
          const newPackagePolicy = {
            ...restOfPackagePolicy,
            inputs: inputs.map((input) => {
              const { streams, ...restOfInput } = input;
              return {
                ...restOfInput,
                streams: streams.map((stream) => {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  const { compiled_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
              };
            }),
          };
          setPackagePolicy(newPackagePolicy);
          if (packagePolicyData.item.package) {
            const { data: packageData } = await sendGetPackageInfoByKey(
              `${packagePolicyData.item.package.name}-${packagePolicyData.item.package.version}`
            );
            if (packageData?.response) {
              setPackageInfo(packageData.response);
              setValidationResults(validatePackagePolicy(newPackagePolicy, packageData.response));
              setFormState('VALID');
            }
          }
        }
      } catch (e) {
        setLoadingError(e);
      }
      setIsLoadingData(false);
    };
    getData();
  }, [policyId, packagePolicyId]);

  // Retrieve agent count
  const [agentCount, setAgentCount] = useState<number>(0);
  useEffect(() => {
    const getAgentCount = async () => {
      const { data } = await sendGetAgentStatus({ policyId });
      if (data?.results.total) {
        setAgentCount(data.results.total);
      }
    };

    if (isFleetEnabled) {
      getAgentCount();
    }
  }, [policyId, isFleetEnabled]);

  // Package policy validation state
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: UpdatePackagePolicy) => {
      if (packageInfo) {
        const newValidationResult = validatePackagePolicy(
          newPackagePolicy || packagePolicy,
          packageInfo
        );
        setValidationResults(newValidationResult);
        // eslint-disable-next-line no-console
        console.debug('Package policy validation results', newValidationResult);

        return newValidationResult;
      }
    },
    [packagePolicy, packageInfo]
  );

  // Update package policy method
  const updatePackagePolicy = useCallback(
    (updatedFields: Partial<UpdatePackagePolicy>) => {
      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      };
      setPackagePolicy(newPackagePolicy);

      // eslint-disable-next-line no-console
      console.debug('Package policy updated', newPackagePolicy);
      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      if (!hasValidationErrors) {
        setFormState('VALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation]
  );

  // Cancel url
  const cancelUrl = getHref('policy_details', { policyId });

  // Save package policy
  const [formState, setFormState] = useState<PackagePolicyFormState>('INVALID');
  const savePackagePolicy = async () => {
    setFormState('LOADING');
    const result = await sendUpdatePackagePolicy(packagePolicyId, packagePolicy);
    setFormState('SUBMITTED');
    return result;
  };

  const onSubmit = async () => {
    if (formState === 'VALID' && hasErrors) {
      setFormState('INVALID');
      return;
    }
    if (agentCount !== 0 && formState !== 'CONFIRM') {
      setFormState('CONFIRM');
      return;
    }
    const { error } = await savePackagePolicy();
    if (!error) {
      history.push(getPath('policy_details', { policyId }));
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.ingestManager.editPackagePolicy.updatedNotificationTitle', {
          defaultMessage: `Successfully updated '{packagePolicyName}'`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        text:
          agentCount && agentPolicy
            ? i18n.translate('xpack.ingestManager.editPackagePolicy.updatedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentPolicyName}' policy`,
                values: {
                  agentPolicyName: agentPolicy.name,
                },
              })
            : undefined,
      });
    } else {
      if (error.statusCode === 409) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.ingestManager.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating '{packagePolicyName}'`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.ingestManager.editPackagePolicy.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest policy.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.ingestManager.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating '{packagePolicyName}'`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
        });
      }
      setFormState('VALID');
    }
  };

  const layoutProps = {
    from: 'edit' as CreatePackagePolicyFrom,
    cancelUrl,
    agentPolicy,
    packageInfo,
  };

  const configurePackage = useMemo(
    () =>
      agentPolicy && packageInfo ? (
        <>
          <StepDefinePackagePolicy
            agentPolicy={agentPolicy}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults!}
          />

          <StepConfigurePackagePolicy
            from={'edit'}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            packagePolicyId={packagePolicyId}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults!}
            submitAttempted={formState === 'INVALID'}
          />
        </>
      ) : null,
    [
      agentPolicy,
      formState,
      packagePolicy,
      packagePolicyId,
      packageInfo,
      updatePackagePolicy,
      validationResults,
    ]
  );

  return (
    <CreatePackagePolicyPageLayout {...layoutProps} data-test-subj="editPackagePolicy">
      {isLoadingData ? (
        <Loading />
      ) : loadingError || !agentPolicy || !packageInfo ? (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.editPackagePolicy.errorLoadingDataTitle"
              defaultMessage="Error loading data"
            />
          }
          error={
            loadingError ||
            i18n.translate('xpack.ingestManager.editPackagePolicy.errorLoadingDataMessage', {
              defaultMessage: 'There was an error loading this intergration information',
            })
          }
        />
      ) : (
        <>
          <Breadcrumb policyName={agentPolicy.name} policyId={policyId} />
          {formState === 'CONFIRM' && (
            <ConfirmDeployAgentPolicyModal
              agentCount={agentCount}
              agentPolicy={agentPolicy}
              onConfirm={onSubmit}
              onCancel={() => setFormState('VALID')}
            />
          )}
          {configurePackage}
          <EuiSpacer size="l" />
          {/* TODO #64541 - Remove classes */}
          <EuiBottomBar
            className={
              uiSettings.get('pageNavigation') === 'legacy'
                ? isNavDrawerLocked
                  ? 'ingestManager__bottomBar-isNavDrawerLocked'
                  : 'ingestManager__bottomBar'
                : undefined
            }
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                {agentPolicy && packageInfo && formState === 'INVALID' ? (
                  <FormattedMessage
                    id="xpack.ingestManager.createPackagePolicy.errorOnSaveText"
                    defaultMessage="Your integration policy has errors. Please fix them before saving."
                  />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="ghost" href={cancelUrl}>
                      <FormattedMessage
                        id="xpack.ingestManager.editPackagePolicy.cancelButton"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={onSubmit}
                      isLoading={formState === 'LOADING'}
                      disabled={formState !== 'VALID'}
                      iconType="save"
                      color="primary"
                      fill
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.editPackagePolicy.saveButton"
                        defaultMessage="Save integration"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </>
      )}
    </CreatePackagePolicyPageLayout>
  );
};

const Breadcrumb: React.FunctionComponent<{ policyName: string; policyId: string }> = ({
  policyName,
  policyId,
}) => {
  useBreadcrumbs('edit_integration', { policyName, policyId });
  return null;
};
