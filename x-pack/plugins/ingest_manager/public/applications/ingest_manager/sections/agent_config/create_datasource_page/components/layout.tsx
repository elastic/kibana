/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { WithHeaderLayout } from '../../../../layouts';
import { AgentConfig, PackageInfo } from '../../../../types';
import { PackageIcon } from '../../../epm/components';
import { CreateDatasourceFrom, CreateDatasourceStep } from '../types';
import { CreateDatasourceStepsNavigation } from './navigation';

export const CreateDatasourcePageLayout: React.FunctionComponent<{
  from: CreateDatasourceFrom;
  basePath: string;
  cancelUrl: string;
  maxStep: CreateDatasourceStep | '';
  currentStep: CreateDatasourceStep;
  agentConfig?: AgentConfig;
  packageInfo?: PackageInfo;
  restrictWidth?: number;
}> = ({
  from,
  basePath,
  cancelUrl,
  maxStep,
  currentStep,
  agentConfig,
  packageInfo,
  restrictWidth,
  children,
}) => {
  return (
    <WithHeaderLayout
      restrictWidth={restrictWidth}
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
          <EuiFlexItem>
            <EuiButtonEmpty size="s" iconType="cross" flush="left" href={cancelUrl}>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.cancelLinkText"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.pageTitle"
                  defaultMessage="Create data source"
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction={from === 'config' ? 'row' : 'rowReverse'} gutterSize="xl">
              {agentConfig || from === 'config' ? (
                <EuiFlexItem grow={false}>
                  <EuiDescriptionList textStyle="reverse">
                    <EuiDescriptionListTitle>
                      <FormattedMessage
                        id="xpack.ingestManager.createDatasource.agentConfigurationNameLabel"
                        defaultMessage="Configuration"
                      />
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {agentConfig?.name || '-'}
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiFlexItem>
              ) : null}
              {packageInfo || from === 'package' ? (
                <EuiFlexItem grow={false}>
                  <EuiDescriptionList textStyle="reverse">
                    <EuiDescriptionListTitle>
                      <FormattedMessage
                        id="xpack.ingestManager.createDatasource.packageNameLabel"
                        defaultMessage="Package"
                      />
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiFlexGroup alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <PackageIcon packageName={packageInfo?.name || ''} size="m" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          {packageInfo?.title || packageInfo?.name || '-'}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      rightColumn={
        <CreateDatasourceStepsNavigation
          from={from}
          basePath={basePath}
          maxStep={maxStep}
          currentStep={currentStep}
        />
      }
    >
      {children}
    </WithHeaderLayout>
  );
};
