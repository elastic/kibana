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
import { AgentPolicy, PackageInfo, PackagePolicy, GetPackagesResponse } from '../../../types';
import {
  useGetOneAgentPolicy,
  useGetPackages,
  useGetLimitedPackages,
  sendGetPackageInfoByKey,
} from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

export const StepSelectPackage: React.FunctionComponent<{
  agentPolicyId: string;
  updateAgentPolicy: (agentPolicy: AgentPolicy | undefined) => void;
  packageInfo?: PackageInfo;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({
  agentPolicyId,
  updateAgentPolicy,
  packageInfo,
  updatePackageInfo,
  setIsLoadingSecondStep,
}) => {
  // Selected package state
  const [selectedPkgKey, setSelectedPkgKey] = useState<string | undefined>(
    packageInfo ? `${packageInfo.name}-${packageInfo.version}` : undefined
  );
  const [selectedPkgError, setSelectedPkgError] = useState<Error>();

  // Fetch agent policy info
  const {
    data: agentPolicyData,
    error: agentPolicyError,
    isLoading: isAgentPoliciesLoading,
  } = useGetOneAgentPolicy(agentPolicyId);

  // Fetch packages info
  // Filter out limited packages already part of selected agent policy
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
    if (packagesData?.response && limitedPackagesData?.response && agentPolicyData?.item) {
      const allPackages = packagesData.response;
      const limitedPackages = limitedPackagesData.response;
      const usedLimitedPackages = (agentPolicyData.item.package_policies as PackagePolicy[])
        .map((packagePolicy) => packagePolicy.package?.name || '')
        .filter((pkgName) => limitedPackages.includes(pkgName));
      setPackages(allPackages.filter((pkg) => !usedLimitedPackages.includes(pkg.name)));
    }
  }, [packagesData, limitedPackagesData, agentPolicyData]);

  // Update parent agent policy state
  useEffect(() => {
    if (agentPolicyData && agentPolicyData.item) {
      updateAgentPolicy(agentPolicyData.item);
    }
  }, [agentPolicyData, updateAgentPolicy]);

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

  // Display agent policy error if there is one
  if (agentPolicyError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createPackagePolicy.stepSelectPackage.errorLoadingPolicyTitle"
            defaultMessage="Error loading agent policy information"
          />
        }
        error={agentPolicyError}
      />
    );
  }

  // Display packages list error if there is one
  if (packagesError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.ingestManager.createPackagePolicy.stepSelectPackage.errorLoadingPackagesTitle"
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
          isLoading={isPackagesLoading || isLimitedPackagesLoading || isAgentPoliciesLoading}
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
              'xpack.ingestManager.createPackagePolicy.stepSelectPackage.filterPackagesInputPlaceholder',
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
                id="xpack.ingestManager.createPackagePolicy.stepSelectPackage.errorLoadingSelectedPackageTitle"
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
