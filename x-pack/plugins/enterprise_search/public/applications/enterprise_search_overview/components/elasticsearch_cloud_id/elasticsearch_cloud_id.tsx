/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { TelemetryLogic } from '../../../shared/telemetry';
import { SendTelemetryHelper } from '../../../shared/telemetry/telemetry_logic';

const onFocusHandler = (e: React.FocusEvent<HTMLInputElement>): void => {
  e.target.select();
};

interface CloudDetails {
  cloudId: string | undefined;
  deploymentUrl: string | undefined;
}

const useCloudDetails = (): CloudDetails => {
  const { cloud } = useValues(KibanaLogic);
  return {
    cloudId: cloud?.cloudId,
    deploymentUrl: cloud?.deploymentUrl,
  };
};

const copyCloudIdHandler = (
  copy: () => void,
  sendTelemetry: ({ action, metric }: SendTelemetryHelper) => void
) => {
  return () => {
    copy();
    sendTelemetry({
      action: 'clicked',
      metric: 'cloud_id',
    });
  };
};

export const ElasticsearchCloudId: React.FC = () => {
  const cloud = useCloudDetails();
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);

  // hide the panel when no cloud context is available
  if (!cloud.cloudId) {
    return null;
  }

  return (
    <EuiPanel color="subdued" grow={false} data-test-subj="CloudIdPanel">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size={'xs'}>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchCloudId.heading', {
                    defaultMessage: 'My Deployment',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={cloud.deploymentUrl} target="_blank" data-test-subj="cloudManageLink">
            {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchCloudId.manageLink', {
              defaultMessage: 'Manage',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiForm component="form">
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.overview.elasticsearchCloudId.cloudIdLabel',
                {
                  defaultMessage: 'Cloud ID',
                }
              )}
            >
              <EuiFieldText
                onFocus={onFocusHandler}
                value={cloud.cloudId}
                compressed
                readOnly
                append={
                  <EuiCopy textToCopy={cloud.cloudId}>
                    {(copy) => (
                      <EuiButtonIcon
                        iconType={'copyClipboard'}
                        onClick={copyCloudIdHandler(copy, sendEnterpriseSearchTelemetry)}
                        iconSize="m"
                        data-test-subj="CopyCloudIdButton"
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.overview.elasticsearchCloudId.copyCloudIdAriaLabel',
                          {
                            defaultMessage: 'Copy Cloud ID',
                          }
                        )}
                      />
                    )}
                  </EuiCopy>
                }
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiButton>
            {i18n.translate(
              'xpack.enterpriseSearch.overview.elasticsearchCloudId.manageApiKeysLink',
              {
                defaultMessage: 'Manage API Keys',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
