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
import { PackageIcon } from '../../../../components/package_icon';
import { CreatePackageConfigFrom } from '../types';

export const CreatePackageConfigPageLayout: React.FunctionComponent<{
  from: CreatePackageConfigFrom;
  cancelUrl: string;
  onCancel?: React.ReactEventHandler;
  agentConfig?: AgentConfig;
  packageInfo?: PackageInfo;
  'data-test-subj'?: string;
}> = ({
  from,
  cancelUrl,
  onCancel,
  agentConfig,
  packageInfo,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const leftColumn = (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          flush="left"
          href={cancelUrl}
          onClick={onCancel}
          data-test-subj={`${dataTestSubj}_cancelBackLink`}
        >
          <FormattedMessage
            id="xpack.ingestManager.createPackageConfig.cancelLinkText"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <h1>
            {from === 'edit' ? (
              <FormattedMessage
                id="xpack.ingestManager.editPackageConfig.pageTitle"
                defaultMessage="Edit integration"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.pageTitle"
                defaultMessage="Add integration"
              />
            )}
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {from === 'edit' ? (
            <FormattedMessage
              id="xpack.ingestManager.editPackageConfig.pageDescription"
              defaultMessage="Follow the instructions below to edit this integration."
            />
          ) : from === 'config' ? (
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.pageDescriptionfromConfig"
              defaultMessage="Follow the instructions below to add an integration to this agent configuration."
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.pageDescriptionfromPackage"
              defaultMessage="Follow the instructions below to add this integration to an agent configuration."
            />
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const rightColumn = (
    <EuiFlexGroup justifyContent="flexEnd" direction={'row'} gutterSize="xl">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        {agentConfig && (from === 'config' || from === 'edit') ? (
          <EuiDescriptionList style={{ textAlign: 'right' }} textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.agentConfigurationNameLabel"
                defaultMessage="Configuration"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {agentConfig?.name || '-'}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        ) : null}
        {packageInfo && from === 'package' ? (
          <EuiDescriptionList style={{ textAlign: 'right' }} textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.packageNameLabel"
                defaultMessage="Integration"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <PackageIcon
                    packageName={packageInfo?.name || ''}
                    version={packageInfo?.version || ''}
                    icons={packageInfo?.icons}
                    size="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {packageInfo?.title || packageInfo?.name || '-'}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const maxWidth = 770;
  return (
    <WithHeaderLayout
      restrictHeaderWidth={maxWidth}
      restrictWidth={maxWidth}
      leftColumn={leftColumn}
      rightColumn={rightColumn}
      rightColumnGrow={false}
      data-test-subj={dataTestSubj}
    >
      {children}
    </WithHeaderLayout>
  );
};
