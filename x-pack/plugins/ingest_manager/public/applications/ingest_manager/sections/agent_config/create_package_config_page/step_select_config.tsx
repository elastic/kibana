/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { Error } from '../../../components';
import { AgentConfig, PackageInfo, GetAgentConfigsResponseItem } from '../../../types';
import { isPackageLimited, doesAgentConfigAlreadyIncludePackage } from '../../../services';
import { useGetPackageInfoByKey, useGetAgentConfigs, sendGetOneAgentConfig } from '../../../hooks';

export const StepSelectConfig: React.FunctionComponent<{
  pkgkey: string;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  agentConfig: AgentConfig | undefined;
  updateAgentConfig: (config: AgentConfig | undefined) => void;
}> = ({ pkgkey, updatePackageInfo, agentConfig, updateAgentConfig }) => {
  // Selected config state
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>(
    agentConfig ? agentConfig.id : undefined
  );
  const [selectedConfigError, setSelectedConfigError] = useState<Error>();

  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: packageInfoLoading,
  } = useGetPackageInfoByKey(pkgkey);
  const isLimitedPackage = (packageInfoData && isPackageLimited(packageInfoData.response)) || false;

  // Fetch agent configs info
  const {
    data: agentConfigsData,
    error: agentConfigsError,
    isLoading: isAgentConfigsLoading,
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
    };
    if (!agentConfig || selectedConfigId !== agentConfig.id) {
      fetchAgentConfigInfo();
    }
  }, [selectedConfigId, agentConfig, updateAgentConfig]);

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
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSelectable
          searchable
          allowExclusions={false}
          singleSelection={true}
          isLoading={isAgentConfigsLoading || packageInfoLoading}
          options={agentConfigs.map((agentConf) => {
            const alreadyHasLimitedPackage =
              (isLimitedPackage &&
                packageInfoData &&
                doesAgentConfigAlreadyIncludePackage(agentConf, packageInfoData.response.name)) ||
              false;
            return {
              label: agentConf.name,
              key: agentConf.id,
              checked: selectedConfigId === agentConf.id ? 'on' : undefined,
              disabled: alreadyHasLimitedPackage,
              'data-test-subj': 'agentConfigItem',
            };
          })}
          renderOption={(option) => (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
              <EuiFlexItem>
                <EuiTextColor color="subdued">
                  {agentConfigsById[option.key!].description}
                </EuiTextColor>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.StepSelectConfig.agentConfigAgentsCountText"
                    defaultMessage="{count, plural, one {# agent} other {# agents}}"
                    values={{
                      count: agentConfigsById[option.key!].agents || 0,
                    }}
                  />
                </EuiTextColor>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          listProps={{
            bordered: true,
          }}
          searchProps={{
            placeholder: i18n.translate(
              'xpack.ingestManager.createPackageConfig.StepSelectConfig.filterAgentConfigsInputPlaceholder',
              {
                defaultMessage: 'Search for agent configurations',
              }
            ),
          }}
          height={240}
          onChange={(options) => {
            const selectedOption = options.find((option) => option.checked === 'on');
            if (selectedOption) {
              setSelectedConfigId(selectedOption.key);
            } else {
              setSelectedConfigId(undefined);
            }
          }}
        >
          {(list, search) => (
            <Fragment>
              {search}
              <EuiSpacer size="m" />
              {list}
            </Fragment>
          )}
        </EuiSelectable>
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
  );
};
