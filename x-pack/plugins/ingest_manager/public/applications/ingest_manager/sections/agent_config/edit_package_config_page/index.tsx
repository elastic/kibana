/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiSteps,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { AgentConfig, PackageInfo, UpdatePackageConfig } from '../../../types';
import {
  useLink,
  useBreadcrumbs,
  useCore,
  useConfig,
  sendUpdatePackageConfig,
  sendGetAgentStatus,
  sendGetOneAgentConfig,
  sendGetOnePackageConfig,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { ConfirmDeployConfigModal } from '../components';
import { CreatePackageConfigPageLayout } from '../create_package_config_page/components';
import {
  PackageConfigValidationResults,
  validatePackageConfig,
  validationHasErrors,
} from '../create_package_config_page/services';
import {
  PackageConfigFormState,
  CreatePackageConfigFrom,
} from '../create_package_config_page/types';
import { StepConfigurePackage } from '../create_package_config_page/step_configure_package';
import { StepDefinePackageConfig } from '../create_package_config_page/step_define_package_config';

export const EditPackageConfigPage: React.FunctionComponent = () => {
  const {
    notifications,
    chrome: { getIsNavDrawerLocked$ },
    uiSettings,
  } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const {
    params: { configId, packageConfigId },
  } = useRouteMatch();
  const history = useHistory();
  const { getHref, getPath } = useLink();
  const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);

  useEffect(() => {
    const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
      setIsNavDrawerLocked(newIsNavDrawerLocked);
    });

    return () => subscription.unsubscribe();
  });

  // Agent config, package info, and package config states
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<Error>();
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [packageConfig, setPackageConfig] = useState<UpdatePackageConfig>({
    name: '',
    description: '',
    namespace: '',
    config_id: '',
    enabled: true,
    output_id: '',
    inputs: [],
    version: '',
  });

  // Retrieve agent config, package, and package config info
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const [{ data: agentConfigData }, { data: packageConfigData }] = await Promise.all([
          sendGetOneAgentConfig(configId),
          sendGetOnePackageConfig(packageConfigId),
        ]);
        if (agentConfigData?.item) {
          setAgentConfig(agentConfigData.item);
        }
        if (packageConfigData?.item) {
          const {
            id,
            revision,
            inputs,
            created_by,
            created_at,
            updated_by,
            updated_at,
            ...restOfPackageConfig
          } = packageConfigData.item;
          // Remove `compiled_stream` from all stream info, we assign this after saving
          const newPackageConfig = {
            ...restOfPackageConfig,
            inputs: inputs.map((input) => {
              const { streams, ...restOfInput } = input;
              return {
                ...restOfInput,
                streams: streams.map((stream) => {
                  const { compiled_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
              };
            }),
          };
          setPackageConfig(newPackageConfig);
          if (packageConfigData.item.package) {
            const { data: packageData } = await sendGetPackageInfoByKey(
              `${packageConfigData.item.package.name}-${packageConfigData.item.package.version}`
            );
            if (packageData?.response) {
              setPackageInfo(packageData.response);
              setValidationResults(validatePackageConfig(newPackageConfig, packageData.response));
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
  }, [configId, packageConfigId]);

  // Retrieve agent count
  const [agentCount, setAgentCount] = useState<number>(0);
  useEffect(() => {
    const getAgentCount = async () => {
      const { data } = await sendGetAgentStatus({ configId });
      if (data?.results.total) {
        setAgentCount(data.results.total);
      }
    };

    if (isFleetEnabled) {
      getAgentCount();
    }
  }, [configId, isFleetEnabled]);

  // Package config validation state
  const [validationResults, setValidationResults] = useState<PackageConfigValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update package config method
  const updatePackageConfig = (updatedFields: Partial<UpdatePackageConfig>) => {
    const newPackageConfig = {
      ...packageConfig,
      ...updatedFields,
    };
    setPackageConfig(newPackageConfig);

    // eslint-disable-next-line no-console
    console.debug('Package config updated', newPackageConfig);
    const newValidationResults = updatePackageConfigValidation(newPackageConfig);
    const hasValidationErrors = newValidationResults
      ? validationHasErrors(newValidationResults)
      : false;
    if (!hasValidationErrors) {
      setFormState('VALID');
    }
  };

  const updatePackageConfigValidation = (newPackageConfig?: UpdatePackageConfig) => {
    if (packageInfo) {
      const newValidationResult = validatePackageConfig(
        newPackageConfig || packageConfig,
        packageInfo
      );
      setValidationResults(newValidationResult);
      // eslint-disable-next-line no-console
      console.debug('Package config validation results', newValidationResult);

      return newValidationResult;
    }
  };

  // Cancel url
  const cancelUrl = getHref('configuration_details', { configId });

  // Save package config
  const [formState, setFormState] = useState<PackageConfigFormState>('INVALID');
  const savePackageConfig = async () => {
    setFormState('LOADING');
    const result = await sendUpdatePackageConfig(packageConfigId, packageConfig);
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
    const { error } = await savePackageConfig();
    if (!error) {
      history.push(getPath('configuration_details', { configId }));
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.ingestManager.editPackageConfig.updatedNotificationTitle', {
          defaultMessage: `Successfully updated '{packageConfigName}'`,
          values: {
            packageConfigName: packageConfig.name,
          },
        }),
        text:
          agentCount && agentConfig
            ? i18n.translate('xpack.ingestManager.editPackageConfig.updatedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentConfigName}' configuration`,
                values: {
                  agentConfigName: agentConfig.name,
                },
              })
            : undefined,
      });
    } else {
      if (error.statusCode === 409) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.ingestManager.editPackageConfig.failedNotificationTitle', {
            defaultMessage: `Error updating '{packageConfigName}'`,
            values: {
              packageConfigName: packageConfig.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.ingestManager.editPackageConfig.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest configuration.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.ingestManager.editPackageConfig.failedNotificationTitle', {
            defaultMessage: `Error updating '{packageConfigName}'`,
            values: {
              packageConfigName: packageConfig.name,
            },
          }),
        });
      }
      setFormState('VALID');
    }
  };

  const layoutProps = {
    from: 'edit' as CreatePackageConfigFrom,
    cancelUrl,
    agentConfig,
    packageInfo,
  };

  return (
    <CreatePackageConfigPageLayout {...layoutProps} data-test-subj="editPackageConfig">
      {isLoadingData ? (
        <Loading />
      ) : loadingError || !agentConfig || !packageInfo ? (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.editPackageConfig.errorLoadingDataTitle"
              defaultMessage="Error loading data"
            />
          }
          error={
            loadingError ||
            i18n.translate('xpack.ingestManager.editPackageConfig.errorLoadingDataMessage', {
              defaultMessage: 'There was an error loading this intergration information',
            })
          }
        />
      ) : (
        <>
          <Breadcrumb configName={agentConfig.name} configId={configId} />
          {formState === 'CONFIRM' && (
            <ConfirmDeployConfigModal
              agentCount={agentCount}
              agentConfig={agentConfig}
              onConfirm={onSubmit}
              onCancel={() => setFormState('VALID')}
            />
          )}
          <EuiSteps
            steps={[
              {
                title: i18n.translate(
                  'xpack.ingestManager.editPackageConfig.stepDefinePackageConfigTitle',
                  {
                    defaultMessage: 'Define your integration',
                  }
                ),
                children: (
                  <StepDefinePackageConfig
                    agentConfig={agentConfig}
                    packageInfo={packageInfo}
                    packageConfig={packageConfig}
                    updatePackageConfig={updatePackageConfig}
                    validationResults={validationResults!}
                  />
                ),
              },
              {
                title: i18n.translate(
                  'xpack.ingestManager.editPackageConfig.stepConfigurePackageConfigTitle',
                  {
                    defaultMessage: 'Select the data you want to collect',
                  }
                ),
                children: (
                  <StepConfigurePackage
                    from={'edit'}
                    packageInfo={packageInfo}
                    packageConfig={packageConfig}
                    packageConfigId={packageConfigId}
                    updatePackageConfig={updatePackageConfig}
                    validationResults={validationResults!}
                    submitAttempted={formState === 'INVALID'}
                  />
                ),
              },
            ]}
          />
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
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" href={cancelUrl}>
                  <FormattedMessage
                    id="xpack.ingestManager.editPackageConfig.cancelButton"
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
                    id="xpack.ingestManager.editPackageConfig.saveButton"
                    defaultMessage="Save integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </>
      )}
    </CreatePackageConfigPageLayout>
  );
};

const Breadcrumb: React.FunctionComponent<{ configName: string; configId: string }> = ({
  configName,
  configId,
}) => {
  useBreadcrumbs('edit_integration', { configName, configId });
  return null;
};
