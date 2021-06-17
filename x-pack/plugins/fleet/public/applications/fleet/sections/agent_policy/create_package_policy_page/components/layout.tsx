/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import type { AgentPolicy, PackageInfo, RegistryPolicyTemplate } from '../../../../types';
import { PackageIcon } from '../../../../components';
import type { CreatePackagePolicyFrom } from '../types';

export const CreatePackagePolicyPageLayout: React.FunctionComponent<{
  from: CreatePackagePolicyFrom;
  cancelUrl: string;
  onCancel?: React.ReactEventHandler;
  agentPolicy?: AgentPolicy;
  packageInfo?: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  'data-test-subj'?: string;
}> = memo(
  ({
    from,
    cancelUrl,
    onCancel,
    agentPolicy,
    packageInfo,
    integrationInfo,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const pageTitle = useMemo(() => {
      if ((from === 'package' || from === 'package-edit' || from === 'edit') && packageInfo) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <PackageIcon
                packageName={packageInfo?.name || ''}
                integrationName={integrationInfo?.name}
                version={packageInfo?.version || ''}
                icons={integrationInfo?.icons || packageInfo?.icons}
                size="xl"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h1 data-test-subj={`${dataTestSubj}_pageTitle`}>
                  {from === 'edit' || from === 'package-edit' ? (
                    <FormattedMessage
                      id="xpack.fleet.editPackagePolicy.pageTitleWithPackageName"
                      defaultMessage="Edit {packageName} integration"
                      values={{
                        packageName: packageInfo.title,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.pageTitleWithPackageName"
                      defaultMessage="Add {packageName} integration"
                      values={{
                        packageName: integrationInfo?.title || packageInfo.title,
                      }}
                    />
                  )}
                </h1>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return from === 'edit' || from === 'package-edit' ? (
        <EuiText>
          <h1 data-test-subj={`${dataTestSubj}_pageTitle`}>
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.pageTitle"
              defaultMessage="Edit integration"
            />
          </h1>
        </EuiText>
      ) : (
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.pageTitle"
              defaultMessage="Add integration"
            />
          </h1>
        </EuiText>
      );
    }, [
      dataTestSubj,
      from,
      integrationInfo?.icons,
      integrationInfo?.name,
      integrationInfo?.title,
      packageInfo,
    ]);

    const pageDescription = useMemo(() => {
      return from === 'edit' || from === 'package-edit' ? (
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.pageDescription"
          defaultMessage="Modify integration settings and deploy changes to the selected agent policy."
        />
      ) : from === 'policy' ? (
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.pageDescriptionfromPolicy"
          defaultMessage="Configure an integration for the selected agent policy."
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.pageDescriptionfromPackage"
          defaultMessage="Follow these instructions to add this integration to an agent policy."
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
              id="xpack.fleet.createPackagePolicy.cancelLinkText"
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
      agentPolicy && (from === 'policy' || from === 'edit') ? (
        <EuiDescriptionList className="eui-textRight" textStyle="reverse">
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.agentPolicyNameLabel"
              defaultMessage="Agent policy"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription className="eui-textBreakWord">
            {agentPolicy?.name || '-'}
          </EuiDescriptionListDescription>
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
