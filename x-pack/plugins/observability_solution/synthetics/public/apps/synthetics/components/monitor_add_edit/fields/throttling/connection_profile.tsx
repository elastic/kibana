/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PROFILE_VALUES_ENUM } from '../../../../../../../common/constants/monitor_defaults';
import { ThrottlingConfig } from '../../../../../../../common/runtime_types';

export const ConnectionProfile = ({
  throttling,
  id,
}: {
  throttling?: ThrottlingConfig;
  id: string;
}) => {
  if (id === PROFILE_VALUES_ENUM.NO_THROTTLING) {
    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="xpack.synthetics.monitorAddEdit.throttling.connectionProfile.disabled.label"
              defaultMessage="No throttling"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (throttling && throttling.value) {
    const { label, value } = throttling;

    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText>{label}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.synthetics.monitorAddEdit.throttling.connectionProfile"
              defaultMessage="({download} Mbps, {upload} Mbps, {latency} ms)"
              values={{
                download: value.download,
                upload: value.upload,
                latency: value.latency,
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="xpack.synthetics.monitorAddEdit.throttling.connectionProfile.custom.label"
              defaultMessage="Custom"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.synthetics.monitorAddEdit.throttling.connectionProfile.custom"
              defaultMessage="(X Mbps, Y Mbps, Z ms)"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};
