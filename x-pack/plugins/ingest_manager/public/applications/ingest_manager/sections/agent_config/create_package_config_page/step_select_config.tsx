/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiTextColor,
  EuiPortal,
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
  useFleetStatus,
} from '../../../hooks';
import { CreateAgentConfigFlyout } from '../list_page/components';

const AgentConfigWrapper = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

// Custom styling for drop down list items due to:
//  1) the max-width and overflow properties is added to prevent long config
//     names/descriptions from overflowing the flex items
//  2) max-width is built from the grow property on the flex items because the value
//     changes based on if Fleet is enabled/setup or not
const AgentConfigNameColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;
const AgentConfigDescriptionColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;

export const StepSelectConfig: React.FunctionComponent<{
  pkgkey: string;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  agentConfig: AgentConfig | undefined;
  updateAgentConfig: (config: AgentConfig | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({ pkgkey, updatePackageInfo, agentConfig, updateAgentConfig, setIsLoadingSecondStep }) => {
  const { isReady: isFleetReady } = useFleetStatus();

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

  const agentConfigOptions: Array<EuiComboBoxOptionOption<string>> = packageInfoData
    ? agentConfigs.map((agentConf) => {
        const alreadyHasLimitedPackage =
          (isLimitedPackage &&
            doesAgentConfigAlreadyIncludePackage(agentConf, packageInfoData.response.name)) ||
          false;
        return {
          label: agentConf.name,
          value: agentConf.id,
          disabled: alreadyHasLimitedPackage,
          'data-test-subj': 'agentConfigItem',
        };
      })
    : [];

  const selectedConfigOption = agentConfigOptions.find(
    (option) => option.value === selectedConfigId
  );

  // Try to select default agent config
  useEffect(() => {
    if (!selectedConfigId && agentConfigs.length && agentConfigOptions.length) {
      const defaultAgentConfig = agentConfigs.find((config) => config.is_default);
      if (defaultAgentConfig) {
        const defaultAgentConfigOption = agentConfigOptions.find(
          (option) => option.value === defaultAgentConfig.id
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
                      disabled={!hasWriteCapabilites}
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
              isFleetReady && selectedConfigId ? (
                <FormattedMessage
                  id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigAgentsDescriptionText"
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
                'xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigPlaceholderText',
                {
                  defaultMessage: 'Select an agent configuration to add this integration to',
                }
              )}
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              fullWidth={true}
              isLoading={isAgentConfigsLoading || isPackageInfoLoading}
              options={agentConfigOptions}
              renderOption={(option: EuiComboBoxOptionOption<string>) => {
                return (
                  <EuiFlexGroup>
                    <AgentConfigNameColumn grow={2}>
                      <span className="eui-textTruncate">{option.label}</span>
                    </AgentConfigNameColumn>
                    <AgentConfigDescriptionColumn grow={isFleetReady ? 5 : 7}>
                      <EuiTextColor className="eui-textTruncate" color="subdued">
                        {agentConfigsById[option.value!].description}
                      </EuiTextColor>
                    </AgentConfigDescriptionColumn>
                    {isFleetReady ? (
                      <EuiFlexItem grow={2} className="eui-textRight">
                        <EuiTextColor color="subdued">
                          <FormattedMessage
                            id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigAgentsCountText"
                            defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
                            values={{
                              count: agentConfigsById[option.value!].agents || 0,
                            }}
                          />
                        </EuiTextColor>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                );
              }}
              selectedOptions={selectedConfigOption ? [selectedConfigOption] : []}
              onChange={(options) => {
                const selectedOption = options[0] || undefined;
                if (selectedOption) {
                  if (selectedOption.value !== selectedConfigId) {
                    setSelectedConfigId(selectedOption.value);
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
