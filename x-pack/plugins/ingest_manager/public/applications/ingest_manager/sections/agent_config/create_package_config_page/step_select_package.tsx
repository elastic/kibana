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
import { AgentConfig, PackageInfo, PackageConfig, GetPackagesResponse } from '../../../types';
import {
  useGetOneAgentConfig,
  useGetPackages,
  useGetLimitedPackages,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

export const StepSelectPackage: React.FunctionComponent<{
  agentConfigId: string;
  updateAgentConfig: (config: AgentConfig | undefined) => void;
  packageInfo?: PackageInfo;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({
  agentConfigId,
  updateAgentConfig,
  packageInfo,
  updatePackageInfo,
  setIsLoadingSecondStep,
}) => {
  // Selected package state
  const [selectedPkgKey, setSelectedPkgKey] = useState<string | undefined>(
    packageInfo ? `${packageInfo.name}-${packageInfo.version}` : undefined
  );
  const [selectedPkgError, setSelectedPkgError] = useState<Error>();

  // Fetch agent config info
  const {
    data: agentConfigData,
    error: agentConfigError,
    isLoading: isAgentConfigsLoading,
  } = useGetOneAgentConfig(agentConfigId);

  // Fetch packages info
  // Filter out limited packages already part of selected agent config
  const [packages, setPackages] = useState<GetPackagesResponse['response']>([]);
  const {
    data: packagesData,
    error: packagesError,
    isLoading: isPackagesLoading,
  } = useGetPackages();
  const {
    data: limitedPackagesData,
    isLoading: isLimitedPackagesLoading,
  } = useGetLimitedPackages();
  useEffect(() => {
    if (packagesData?.response && limitedPackagesData?.response && agentConfigData?.item) {
      const allPackages = packagesData.response;
      const limitedPackages = limitedPackagesData.response;
      const usedLimitedPackages = (agentConfigData.item.package_configs as PackageConfig[])
        .map((packageConfig) => packageConfig.package?.name || '')
        .filter((pkgName) => limitedPackages.includes(pkgName));
      setPackages(allPackages.filter((pkg) => !usedLimitedPackages.includes(pkg.name)));
    }
  }, [packagesData, limitedPackagesData, agentConfigData]);

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
        setIsLoadingSecondStep(true);
        const { data, error } = await sendGetPackageInfoByKey(selectedPkgKey);
        if (error) {
          setSelectedPkgError(error);
          updatePackageInfo(undefined);
        } else if (data && data.response) {
          setSelectedPkgError(undefined);
          updatePackageInfo(data.response);
        }
        setIsLoadingSecondStep(false);
      } else {
        setSelectedPkgError(undefined);
        updatePackageInfo(undefined);
      }
    };
    if (!packageInfo || selectedPkgKey !== `${packageInfo.name}-${packageInfo.version}`) {
      fetchPackageInfo();
    }
  }, [selectedPkgKey, packageInfo, updatePackageInfo, setIsLoadingSecondStep]);

  // Display agent config error if there is one
  if (agentConfigError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createPackageConfig.stepSelectPackage.errorLoadingConfigTitle"
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
            id="xpack.ingestManager.createPackageConfig.stepSelectPackage.errorLoadingPackagesTitle"
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
          isLoading={isPackagesLoading || isLimitedPackagesLoading || isAgentConfigsLoading}
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
              'xpack.ingestManager.createPackageConfig.stepSelectPackage.filterPackagesInputPlaceholder',
              {
                defaultMessage: 'Search for integrations',
              }
            ),
          }}
          height={240}
          onChange={(options) => {
            const selectedOption = options.find((option) => option.checked === 'on');
            if (selectedOption) {
              if (selectedOption.key !== selectedPkgKey) {
                setSelectedPkgKey(selectedOption.key);
              }
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
                id="xpack.ingestManager.createPackageConfig.stepSelectPackage.errorLoadingSelectedPackageTitle"
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
