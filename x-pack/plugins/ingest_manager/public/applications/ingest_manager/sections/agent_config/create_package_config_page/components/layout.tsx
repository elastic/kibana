/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
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
}> = memo(
  ({
    from,
    cancelUrl,
    onCancel,
    agentConfig,
    packageInfo,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const pageTitle = useMemo(() => {
      if ((from === 'package' || from === 'edit') && packageInfo) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <PackageIcon
                packageName={packageInfo?.name || ''}
                version={packageInfo?.version || ''}
                icons={packageInfo?.icons}
                size="xl"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h1>
                  {from === 'edit' ? (
                    <FormattedMessage
                      id="xpack.ingestManager.editPackageConfig.pageTitleWithPackageName"
                      defaultMessage="Edit {packageName} integration"
                      values={{
                        packageName: packageInfo.title,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.ingestManager.createPackageConfig.pageTitleWithPackageName"
                      defaultMessage="Add {packageName} integration"
                      values={{
                        packageName: packageInfo.title,
                      }}
                    />
                  )}
                </h1>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return from === 'edit' ? (
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.editPackageConfig.pageTitle"
              defaultMessage="Edit integration"
            />
          </h1>
        </EuiText>
      ) : (
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.pageTitle"
              defaultMessage="Add integration"
            />
          </h1>
        </EuiText>
      );
    }, [from, packageInfo]);

    const pageDescription = useMemo(() => {
      return from === 'edit' ? (
        <FormattedMessage
          id="xpack.ingestManager.editPackageConfig.pageDescription"
          defaultMessage="Modify integration settings and deploy changes to the selected agent configuration."
        />
      ) : from === 'config' ? (
        <FormattedMessage
          id="xpack.ingestManager.createPackageConfig.pageDescriptionfromConfig"
          defaultMessage="Configure an integration for the selected agent configuration."
        />
      ) : (
        <FormattedMessage
          id="xpack.ingestManager.createPackageConfig.pageDescriptionfromPackage"
          defaultMessage="Follow the instructions below to add this integration to an agent configuraiton."
        />
      );
    }, [from]);

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
        <EuiFlexItem>{pageTitle}</EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {pageDescription}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const rightColumn =
      agentConfig && (from === 'config' || from === 'edit') ? (
        <EuiDescriptionList className="eui-textRight" textStyle="reverse">
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.agentConfigurationNameLabel"
              defaultMessage="Agent configuration"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{agentConfig?.name || '-'}</EuiDescriptionListDescription>
        </EuiDescriptionList>
      ) : undefined;

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
  }
);
