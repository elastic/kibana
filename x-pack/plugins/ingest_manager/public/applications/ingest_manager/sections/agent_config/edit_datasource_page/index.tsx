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
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { AgentConfig, PackageInfo, NewDatasource } from '../../../types';
import {
  useLink,
  useCore,
  useConfig,
  sendUpdateDatasource,
  sendGetAgentStatus,
  sendGetOneAgentConfig,
  sendGetOneDatasource,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { Loading, Error } from '../../../components';
import { ConfirmDeployConfigModal } from '../components';
import { CreateDatasourcePageLayout } from '../create_datasource_page/components';
import {
  DatasourceValidationResults,
  validateDatasource,
  validationHasErrors,
} from '../create_datasource_page/services';
import { DatasourceFormState, CreateDatasourceFrom } from '../create_datasource_page/types';
import { StepConfigureDatasource } from '../create_datasource_page/step_configure_datasource';
import { StepDefineDatasource } from '../create_datasource_page/step_define_datasource';

export const EditDatasourcePage: React.FunctionComponent = () => {
  const { notifications } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const {
    params: { configId, datasourceId },
  } = useRouteMatch();
  const history = useHistory();

  // Agent config, package info, and datasource states
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<Error>();
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();
  const [datasource, setDatasource] = useState<NewDatasource>({
    name: '',
    description: '',
    config_id: '',
    enabled: true,
    output_id: '',
    inputs: [],
  });

  // Retrieve agent config, package, and datasource info
  useEffect(() => {
    const getData = async () => {
      setIsLoadingData(true);
      setLoadingError(undefined);
      try {
        const [{ data: agentConfigData }, { data: datasourceData }] = await Promise.all([
          sendGetOneAgentConfig(configId),
          sendGetOneDatasource(datasourceId),
        ]);
        if (agentConfigData?.item) {
          setAgentConfig(agentConfigData.item);
        }
        if (datasourceData?.item) {
          const { id, revision, inputs, ...restOfDatasource } = datasourceData.item;
          // Remove `agent_stream` from all stream info, we assign this after saving
          const newDatasource = {
            ...restOfDatasource,
            inputs: inputs.map(input => {
              const { streams, ...restOfInput } = input;
              return {
                ...restOfInput,
                streams: streams.map(stream => {
                  const { agent_stream, ...restOfStream } = stream;
                  return restOfStream;
                }),
              };
            }),
          };
          setDatasource(newDatasource);
          if (datasourceData.item.package) {
            const { data: packageData } = await sendGetPackageInfoByKey(
              `${datasourceData.item.package.name}-${datasourceData.item.package.version}`
            );
            if (packageData?.response) {
              setPackageInfo(packageData.response);
              setValidationResults(validateDatasource(newDatasource, packageData.response));
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
  }, [configId, datasourceId]);

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

  // Datasource validation state
  const [validationResults, setValidationResults] = useState<DatasourceValidationResults>();
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Update datasource method
  const updateDatasource = (updatedFields: Partial<NewDatasource>) => {
    const newDatasource = {
      ...datasource,
      ...updatedFields,
    };
    setDatasource(newDatasource);

    // eslint-disable-next-line no-console
    console.debug('Datasource updated', newDatasource);
    const newValidationResults = updateDatasourceValidation(newDatasource);
    const hasValidationErrors = newValidationResults
      ? validationHasErrors(newValidationResults)
      : false;
    if (!hasValidationErrors) {
      setFormState('VALID');
    }
  };

  const updateDatasourceValidation = (newDatasource?: NewDatasource) => {
    if (packageInfo) {
      const newValidationResult = validateDatasource(newDatasource || datasource, packageInfo);
      setValidationResults(newValidationResult);
      // eslint-disable-next-line no-console
      console.debug('Datasource validation results', newValidationResult);

      return newValidationResult;
    }
  };

  // Cancel url
  const CONFIG_URL = useLink(`${AGENT_CONFIG_DETAILS_PATH}${configId}`);
  const cancelUrl = CONFIG_URL;

  // Save datasource
  const [formState, setFormState] = useState<DatasourceFormState>('INVALID');
  const saveDatasource = async () => {
    setFormState('LOADING');
    const result = await sendUpdateDatasource(datasourceId, datasource);
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
    const { error } = await saveDatasource();
    if (!error) {
      history.push(`${AGENT_CONFIG_DETAILS_PATH}${configId}`);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.ingestManager.editDatasource.updatedNotificationTitle', {
          defaultMessage: `Successfully updated '{datasourceName}'`,
          values: {
            datasourceName: datasource.name,
          },
        }),
        text:
          agentCount && agentConfig
            ? i18n.translate('xpack.ingestManager.editDatasource.updatedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the '{agentConfigName}' configuration`,
                values: {
                  agentConfigName: agentConfig.name,
                },
              })
            : undefined,
      });
    } else {
      notifications.toasts.addError(error, {
        title: 'Error',
      });
      setFormState('VALID');
    }
  };

  const layoutProps = {
    from: 'edit' as CreateDatasourceFrom,
    cancelUrl,
    agentConfig,
    packageInfo,
  };

  return (
    <CreateDatasourcePageLayout {...layoutProps}>
      {isLoadingData ? (
        <Loading />
      ) : loadingError || !agentConfig || !packageInfo ? (
        <Error
          title={
            <FormattedMessage
              id="xpack.ingestManager.editDatasource.errorLoadingDataTitle"
              defaultMessage="Error loading data"
            />
          }
          error={
            loadingError ||
            i18n.translate('xpack.ingestManager.editDatasource.errorLoadingDataMessage', {
              defaultMessage: 'There was an error loading this data source information',
            })
          }
        />
      ) : (
        <>
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
                  'xpack.ingestManager.editDatasource.stepDefineDatasourceTitle',
                  {
                    defaultMessage: 'Define your data source',
                  }
                ),
                children: (
                  <StepDefineDatasource
                    agentConfig={agentConfig}
                    packageInfo={packageInfo}
                    datasource={datasource}
                    updateDatasource={updateDatasource}
                    validationResults={validationResults!}
                  />
                ),
              },
              {
                title: i18n.translate(
                  'xpack.ingestManager.editDatasource.stepConfgiureDatasourceTitle',
                  {
                    defaultMessage: 'Select the data you want to collect',
                  }
                ),
                children: (
                  <StepConfigureDatasource
                    packageInfo={packageInfo}
                    datasource={datasource}
                    updateDatasource={updateDatasource}
                    validationResults={validationResults!}
                    submitAttempted={formState === 'INVALID'}
                  />
                ),
              },
            ]}
          />
          <EuiSpacer size="l" />
          <EuiBottomBar css={{ zIndex: 5 }} paddingSize="s">
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" href={cancelUrl}>
                  <FormattedMessage
                    id="xpack.ingestManager.editDatasource.cancelButton"
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
                    id="xpack.ingestManager.editDatasource.saveButton"
                    defaultMessage="Save data source"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </>
      )}
    </CreateDatasourcePageLayout>
  );
};
