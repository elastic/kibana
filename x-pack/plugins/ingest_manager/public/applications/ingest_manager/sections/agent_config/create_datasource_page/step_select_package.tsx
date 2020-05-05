/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiSpacer } from '@elastic/eui';
import { Error } from '../../../components';
import { AgentConfig, PackageInfo } from '../../../types';
import { useGetOneAgentConfig, useGetPackages, sendGetPackageInfoByKey } from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

export const StepSelectPackage: React.FunctionComponent<{
  agentConfigId: string;
  updateAgentConfig: (config: AgentConfig | undefined) => void;
  packageInfo?: PackageInfo;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
}> = ({ agentConfigId, updateAgentConfig, packageInfo, updatePackageInfo }) => {
  // Selected package state
  const [selectedPkgKey, setSelectedPkgKey] = useState<string | undefined>(
    packageInfo ? `${packageInfo.name}-${packageInfo.version}` : undefined
  );
  const [selectedPkgError, setSelectedPkgError] = useState<Error>();

  // Fetch agent config info
  const { data: agentConfigData, error: agentConfigError } = useGetOneAgentConfig(agentConfigId);

  // Fetch packages info
  const {
    data: packagesData,
    error: packagesError,
    isLoading: isPackagesLoading,
  } = useGetPackages();
  const packages = packagesData?.response || [];

  // Update parent agent config state
  useEffect(() => {
    if (agentConfigData && agentConfigData.item) {
      updateAgentConfig(agentConfigData.item);
    }
  }, [agentConfigData, updateAgentConfig]);

  // Update parent selected package state
  useEffect(() => {
    const fetchPackageInfo = async () => {
      if (selectedPkgKey) {
        const { data, error } = await sendGetPackageInfoByKey(selectedPkgKey);
        if (error) {
          setSelectedPkgError(error);
          updatePackageInfo(undefined);
        } else if (data && data.response) {
          setSelectedPkgError(undefined);
          updatePackageInfo(data.response);
        }
      } else {
        setSelectedPkgError(undefined);
        updatePackageInfo(undefined);
      }
    };
    if (!packageInfo || selectedPkgKey !== `${packageInfo.name}-${packageInfo.version}`) {
      fetchPackageInfo();
    }
  }, [selectedPkgKey, packageInfo, updatePackageInfo]);

  // Display agent config error if there is one
  if (agentConfigError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createDatasource.stepSelectPackage.errorLoadingConfigTitle"
            defaultMessage="Error loading agent configuration information"
          />
        }
        error={agentConfigError}
      />
    );
  }

  // Display packages list error if there is one
  if (packagesError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createDatasource.stepSelectPackage.errorLoadingPackagesTitle"
            defaultMessage="Error loading integrations"
          />
        }
        error={packagesError}
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
          isLoading={isPackagesLoading}
          options={packages.map(({ title, name, version, icons }) => {
            const pkgkey = `${name}-${version}`;
            return {
              label: title || name,
              key: pkgkey,
              prepend: (
                <PackageIcon
                  packageName={name}
                  version={version}
                  icons={icons}
                  size="m"
                  tryApi={true}
                />
              ),
              checked: selectedPkgKey === pkgkey ? 'on' : undefined,
            };
          })}
          listProps={{
            bordered: true,
          }}
          searchProps={{
            placeholder: i18n.translate(
              'xpack.ingestManager.createDatasource.stepSelectPackage.filterPackagesInputPlaceholder',
              {
                defaultMessage: 'Search for integrations',
              }
            ),
          }}
          height={240}
          onChange={options => {
            const selectedOption = options.find(option => option.checked === 'on');
            if (selectedOption) {
              setSelectedPkgKey(selectedOption.key);
            } else {
              setSelectedPkgKey(undefined);
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
      {/* Display selected package error if there is one */}
      {selectedPkgError ? (
        <EuiFlexItem>
          <Error
            title={
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepSelectPackage.errorLoadingSelectedPackageTitle"
                defaultMessage="Error loading selected integration"
              />
            }
            error={selectedPkgError}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
