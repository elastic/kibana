/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiSpacer,
  EuiTextColor,
  EuiPortal,
  EuiButtonEmpty,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { Error } from '../../../components';
import { AgentConfig, PackageInfo, GetAgentConfigsResponseItem } from '../../../types';
import { isPackageLimited, doesAgentConfigAlreadyIncludePackage } from '../../../services';
import {
  useGetPackageInfoByKey,
  useGetAgentConfigs,
  sendGetOneAgentConfig,
  useCapabilities,
} from '../../../hooks';
import { CreateAgentConfigFlyout } from '../list_page/components';

const AgentConfigWrapper = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

const AgentConfigNameColumn = styled(EuiFlexItem)`
  max-width: ${(2 / 9) * 100}%;
  overflow: hidden;
`;

const AgentConfigDescriptionColumn = styled(EuiFlexItem)`
  max-width: ${(5 / 9) * 100}%;
  overflow: hidden;
`;

export const StepSelectConfig: React.FunctionComponent<{
  pkgkey: string;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  agentConfig: AgentConfig | undefined;
  updateAgentConfig: (config: AgentConfig | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({ pkgkey, updatePackageInfo, agentConfig, updateAgentConfig, setIsLoadingSecondStep }) => {
  // Selected config state
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>(
    agentConfig ? agentConfig.id : undefined
  );
  const [selectedConfigError, setSelectedConfigError] = useState<Error>();

  // Create new config flyout state
  const hasWriteCapabilites = useCapabilities().write;
  const [isCreateAgentConfigFlyoutOpen, setIsCreateAgentConfigFlyoutOpen] = useState<boolean>(
    false
  );

  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgkey);
  const isLimitedPackage = (packageInfoData && isPackageLimited(packageInfoData.response)) || false;

  // Fetch agent configs info
  const {
    data: agentConfigsData,
    error: agentConfigsError,
    isLoading: isAgentConfigsLoading,
    sendRequest: refreshAgentConfigs,
  } = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
    sortField: 'name',
    sortOrder: 'asc',
    full: true,
  });
  const agentConfigs = agentConfigsData?.items || [];
  const agentConfigsById = agentConfigs.reduce(
    (acc: { [key: string]: GetAgentConfigsResponseItem }, config) => {
      acc[config.id] = config;
      return acc;
    },
    {}
  );

  // Update parent package state
  useEffect(() => {
    if (packageInfoData && packageInfoData.response) {
      updatePackageInfo(packageInfoData.response);
    }
  }, [packageInfoData, updatePackageInfo]);

  // Update parent selected agent config state
  useEffect(() => {
    const fetchAgentConfigInfo = async () => {
      if (selectedConfigId) {
        setIsLoadingSecondStep(true);
        const { data, error } = await sendGetOneAgentConfig(selectedConfigId);
        if (error) {
          setSelectedConfigError(error);
          updateAgentConfig(undefined);
        } else if (data && data.item) {
          setSelectedConfigError(undefined);
          updateAgentConfig(data.item);
        }
      } else {
        setSelectedConfigError(undefined);
        updateAgentConfig(undefined);
      }
      setIsLoadingSecondStep(false);
    };
    if (!agentConfig || selectedConfigId !== agentConfig.id) {
      fetchAgentConfigInfo();
    }
  }, [selectedConfigId, agentConfig, updateAgentConfig, setIsLoadingSecondStep]);

  const agentConfigOptions = packageInfoData
    ? agentConfigs.map((agentConf) => {
        const alreadyHasLimitedPackage =
          (isLimitedPackage &&
            doesAgentConfigAlreadyIncludePackage(agentConf, packageInfoData.response.name)) ||
          false;
        return {
          label: agentConf.name,
          key: agentConf.id,
          disabled: alreadyHasLimitedPackage,
          'data-test-subj': 'agentConfigItem',
        };
      })
    : [];

  const selectedConfigOption = agentConfigOptions.find((option) => option.key === selectedConfigId);

  // Try to select default agent config
  useEffect(() => {
    if (!selectedConfigId && agentConfigs.length && agentConfigOptions.length) {
      const defaultAgentConfig = agentConfigs.find((config) => config.is_default);
      if (defaultAgentConfig) {
        const defaultAgentConfigOption = agentConfigOptions.find(
          (option) => option.key === defaultAgentConfig.id
        );
        if (defaultAgentConfigOption && !defaultAgentConfigOption.disabled) {
          setSelectedConfigId(defaultAgentConfig.id);
        }
      }
    }
  }, [agentConfigs, agentConfigOptions, selectedConfigId]);

  // Display package error if there is one
  if (packageInfoError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createPackageConfig.StepSelectConfig.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={packageInfoError}
      />
    );
  }

  // Display agent configs list error if there is one
  if (agentConfigsError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createPackageConfig.StepSelectConfig.errorLoadingAgentConfigsTitle"
            defaultMessage="Error loading agent configurations"
          />
        }
        error={agentConfigsError}
      />
    );
  }

  return (
    <>
      {isCreateAgentConfigFlyoutOpen ? (
        <EuiPortal>
          <CreateAgentConfigFlyout
            onClose={(newAgentConfig?: AgentConfig) => {
              setIsCreateAgentConfigFlyoutOpen(false);
              if (newAgentConfig) {
                refreshAgentConfigs();
                setSelectedConfigId(newAgentConfig.id);
              }
            }}
            ownFocus={true}
          />
        </EuiPortal>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <AgentConfigWrapper
            fullWidth={true}
            label={
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigLabel"
                    defaultMessage="Agent configuration"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div>
                    <EuiLink
                      isDisabled={!hasWriteCapabilites}
                      onClick={() => setIsCreateAgentConfigFlyoutOpen(true)}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.createPackageConfig.StepSelectConfig.addButton"
                        defaultMessage="Create agent configuration"
                      />
                    </EuiLink>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText={
              selectedConfigId ? (
                <FormattedMessage
                  id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigAgentsCountText"
                  defaultMessage="{count, plural, one {# agent} other {# agents}} are enrolled with the selected agent configuration."
                  values={{
                    count: agentConfigsById[selectedConfigId].agents || 0,
                  }}
                />
              ) : null
            }
          >
            <EuiComboBox
              placeholder={i18n.translate(
                'pack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigPlaceholderText',
                {
                  defaultMessage: 'Select an agent configuration to add this integration to',
                }
              )}
              singleSelection={{ asPlainText: true }}
              fullWidth={true}
              isLoading={isAgentConfigsLoading || isPackageInfoLoading}
              options={agentConfigOptions}
              renderOption={(option) => {
                return (
                  <EuiFlexGroup>
                    <AgentConfigNameColumn grow={2}>
                      <span className="eui-textTruncate">{option.label}</span>
                    </AgentConfigNameColumn>
                    <AgentConfigDescriptionColumn grow={5}>
                      <EuiTextColor className="eui-textTruncate" color="subdued">
                        {agentConfigsById[option.key!].description}
                      </EuiTextColor>
                    </AgentConfigDescriptionColumn>
                    <EuiFlexItem grow={2} className="eui-textRight">
                      <EuiTextColor color="subdued">
                        <FormattedMessage
                          id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigAgentsCountText"
                          defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
                          values={{
                            count: agentConfigsById[option.key!].agents || 0,
                          }}
                        />
                      </EuiTextColor>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              }}
              selectedOptions={selectedConfigOption ? [selectedConfigOption] : []}
              onChange={(options) => {
                const selectedOption = options[0] || undefined;
                if (selectedOption) {
                  if (selectedOption.key !== selectedConfigId) {
                    setSelectedConfigId(selectedOption.key);
                  }
                } else {
                  setSelectedConfigId(undefined);
                }
              }}
            />
          </AgentConfigWrapper>
        </EuiFlexItem>
        {/* Display selected agent config error if there is one */}
        {selectedConfigError ? (
          <EuiFlexItem>
            <Error
              title={
                <FormattedMessage
                  id="xpack.ingestManager.createPackageConfig.StepSelectConfig.errorLoadingSelectedAgentConfigTitle"
                  defaultMessage="Error loading selected agent config"
                />
              }
              error={selectedConfigError}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
