/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButton,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { selectOverviewStatus } from '../state/overview_status';
import { useCanReadSyntheticsIndex } from '../../../hooks/use_capabilities';
import {
  LICENSE_MISSING_ERROR,
  LICENSE_NOT_ACTIVE_ERROR,
  LICENSE_NOT_SUPPORTED_ERROR,
  SYNTHETICS_INDEX_PATTERN,
} from '../../../../common/constants';
import { useSyntheticsSettingsContext } from '../contexts';

export const useSyntheticsPrivileges = () => {
  const { canRead: canReadSyntheticsIndex, loading: isCanReadLoading } =
    useCanReadSyntheticsIndex();
  const { error } = useSelector(selectOverviewStatus);

  if (!isCanReadLoading && !canReadSyntheticsIndex) {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        style={{ height: 'calc(100vh - 150px)' }}
      >
        <EuiFlexItem grow={false}>
          <Unprivileged unprivilegedIndices={[SYNTHETICS_INDEX_PATTERN]} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (
    error?.body?.message &&
    [LICENSE_NOT_ACTIVE_ERROR, LICENSE_MISSING_ERROR, LICENSE_NOT_SUPPORTED_ERROR].includes(
      error?.body?.message
    )
  ) {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        style={{ height: 'calc(100vh - 150px)' }}
      >
        <EuiFlexItem grow={false}>
          <LicenseExpired />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};

const Unprivileged = ({ unprivilegedIndices }: { unprivilegedIndices: string[] }) => (
  <EuiEmptyPrompt
    data-test-subj="syntheticsUnprivileged"
    color="plain"
    icon={<EuiIcon type="logoObservability" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.synthetics.noFindingsStates.unprivileged.unprivilegedTitle"
          defaultMessage="Privileges required"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.synthetics.noFindingsStates.unprivileged.unprivilegedDescription"
          defaultMessage="To view Synthetics monitors data, you must update privileges. For more information, contact your Kibana administrator."
        />
      </p>
    }
    footer={
      <EuiMarkdownFormat
        css={css`
          text-align: initial;
        `}
        children={
          i18n.translate(
            'xpack.synthetics.noFindingsStates.unprivileged.unprivilegedFooterMarkdown',
            {
              defaultMessage:
                'Required Elasticsearch index privilege `read` for the following indices:',
            }
          ) + unprivilegedIndices.map((idx) => `\n- \`${idx}\``)
        }
      />
    }
  />
);

const LicenseExpired = () => {
  const { basePath } = useSyntheticsSettingsContext();
  return (
    <EuiEmptyPrompt
      data-test-subj="syntheticsUnprivileged"
      iconType="warning"
      iconColor="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.synthetics.license.invalidLicenseTitle"
            defaultMessage="Invalid License"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.synthetics.license.invalidLicenseDescription"
            defaultMessage="The Synthetics UI is not available because your current license has expired or is no longer valid."
          />
        </p>
      }
      actions={[
        <EuiButton
          data-test-subj="apmInvalidLicenseNotificationManageYourLicenseButton"
          href={basePath + '/app/management/stack/license_management'}
        >
          {i18n.translate('xpack.synthetics.invalidLicense.licenseManagementLink', {
            defaultMessage: 'Manage your license',
          })}
        </EuiButton>,
      ]}
    />
  );
};
