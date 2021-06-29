/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

import type { AgentPolicy, PackageInfo, UpdatePackagePolicy } from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  useStartServices,
  useConfig,
  useUIExtension,
  sendUpdatePackagePolicy,
  sendGetAgentStatus,
  sendGetOneAgentPolicy,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { Loading, Error, ExtensionWrapper } from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicyPageLayout } from '../create_package_policy_page/components';
import type { PackagePolicyValidationResults } from '../create_package_policy_page/services';
import { validatePackagePolicy, validationHasErrors } from '../create_package_policy_page/services';
import type {
  PackagePolicyFormState,
  CreatePackagePolicyFrom,
} from '../create_package_policy_page/types';
import { StepConfigurePackagePolicy } from '../create_package_policy_page/step_configure_package';
import { StepDefinePackagePolicy } from '../create_package_policy_page/step_define_package_policy';
import type { GetOnePackagePolicyResponse } from '../../../../../../common/types/rest_spec';
import type { PackagePolicyEditExtensionComponentProps } from '../../../types';
import { pkgKeyFromPackageInfo } from '../../../services';

export const EditPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();

  return <EditPackagePolicyForm packagePolicyId={packagePolicyId} />;
});

export const EditPackagePolicyForm = memo<{
  packagePolicyId: string;
  from?: CreatePackagePolicyFrom;
}>(({ packagePolicyId, from = 'edit' }) => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const history = useHistory();
  const { getHref, getPath } = useLink();

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
  const [originalPackagePolicy, setOriginalPackagePolicy] = useState<
    GetOnePackagePolicyResponse['item']
  >();

  const policyId = agentPolicy?.id ?? '';

  // Retrieve agent policy, package, and package policy info
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const {
          data: packagePolicyData,
          error: packagePolicyError,
        } = await sendGetOnePackagePolicy(packagePolicyId);

        if (packagePolicyError) {
          throw packagePolicyError;
        }

        const { data: agentPolicyData, error: agentPolicyError } = await sendGetOneAgentPolicy(
          packagePolicyData!.item.policy_id
        );

        if (agentPolicyError) {
          throw agentPolicyError;
        }

        if (agentPolicyData?.item) {
          setAgentPolicy(agentPolicyData.item);
        }
        if (packagePolicyData?.item) {
          setOriginalPackagePolicy(packagePolicyData.item);

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
              // Remove `compiled_input` from all input info, we assign this after saving
              const { streams, compiled_input: compiledInput, ...restOfInput } = input;
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
              pkgKeyFromPackageInfo(packagePolicyData.item.package)
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

    if (isFleetEnabled && policyId) {
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

  const handleExtensionViewOnChange = useCallback<
    PackagePolicyEditExtensionComponentProps['onChange']
  >(
    ({ isValid, updatedPolicy }) => {
      updatePackagePolicy(updatedPolicy);
      setFormState((prevState) => {
        if (prevState === 'VALID' && !isValid) {
          return 'INVALID';
        }
        return prevState;
      });
    },
    [updatePackagePolicy]
  );

  // Cancel url + Success redirect Path:
  //  if `from === 'edit'` then it links back to Policy Details
  //  if `from === 'package-edit'` then it links back to the Integration Policy List
  const cancelUrl = useMemo((): string => {
    if (packageInfo && policyId) {
      return from === 'package-edit'
        ? getHref('integration_details_policies', {
            pkgkey: pkgKeyFromPackageInfo(packageInfo!),
          })
        : getHref('policy_details', { policyId });
    }
    return '/';
  }, [from, getHref, packageInfo, policyId]);

  const successRedirectPath = useMemo(() => {
    if (packageInfo && policyId) {
      return from === 'package-edit'
        ? getPath('integration_details_policies', {
            pkgkey: pkgKeyFromPackageInfo(packageInfo!),
          })
        : getPath('policy_details', { policyId });
    }
    return '/';
  }, [from, getPath, packageInfo, policyId]);

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
      history.push(successRedirectPath);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationTitle', {
          defaultMessage: `Successfully updated '{packagePolicyName}'`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        'data-test-subj': 'policyUpdateSuccessToast',
        text:
          agentCount && agentPolicy
            ? i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationMessage', {
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
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating '{packagePolicyName}'`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.fleet.editPackagePolicy.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest policy.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
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
    from,
    cancelUrl,
    agentPolicy,
    packageInfo,
  };

  const ExtensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-edit');

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
            submitAttempted={formState === 'INVALID'}
          />

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!ExtensionView && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults!}
              submitAttempted={formState === 'INVALID'}
            />
          )}

          {ExtensionView &&
            packagePolicy.policy_id &&
            packagePolicy.package?.name &&
            originalPackagePolicy && (
              <ExtensionWrapper>
                <ExtensionView
                  policy={originalPackagePolicy}
                  newPolicy={packagePolicy}
                  onChange={handleExtensionViewOnChange}
                />
              </ExtensionWrapper>
            )}
        </>
      ) : null,
    [
      agentPolicy,
      packageInfo,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      originalPackagePolicy,
      ExtensionView,
      handleExtensionViewOnChange,
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
              id="xpack.fleet.editPackagePolicy.errorLoadingDataTitle"
              defaultMessage="Error loading data"
            />
          }
          error={
            loadingError ||
            i18n.translate('xpack.fleet.editPackagePolicy.errorLoadingDataMessage', {
              defaultMessage: 'There was an error loading this integration information',
            })
          }
        />
      ) : (
        <>
          {from === 'package' || from === 'package-edit' ? (
            <IntegrationsBreadcrumb
              pkgkey={pkgKeyFromPackageInfo(packageInfo)}
              pkgTitle={packageInfo.title}
              policyName={packagePolicy.name}
            />
          ) : (
            <PoliciesBreadcrumb policyName={agentPolicy.name} policyId={policyId} />
          )}
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
          <EuiBottomBar>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                {agentPolicy && packageInfo && formState === 'INVALID' ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.errorOnSaveText"
                    defaultMessage="Your integration policy has errors. Please fix them before saving."
                  />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="ghost" href={cancelUrl}>
                      <FormattedMessage
                        id="xpack.fleet.editPackagePolicy.cancelButton"
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
                      data-test-subj="saveIntegration"
                    >
                      <FormattedMessage
                        id="xpack.fleet.editPackagePolicy.saveButton"
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
});

const PoliciesBreadcrumb: React.FunctionComponent<{ policyName: string; policyId: string }> = ({
  policyName,
  policyId,
}) => {
  useBreadcrumbs('edit_integration', { policyName, policyId });
  return null;
};

const IntegrationsBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useBreadcrumbs('integration_policy_edit', { policyName, pkgTitle, pkgkey });
  return null;
});
