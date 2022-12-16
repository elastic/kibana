/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { SnapshotNodePath } from '../../../../../common/http_api';

export type CloudProviders = NonNullable<SnapshotNodePath['cloudProvider']>;
const cloudIcons: Record<CloudProviders, string> = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
  unknownProvider: 'cloudSunny',
};

export const CloudProviderIconWithTitle = ({
  provider,
  title,
  text,
}: {
  provider?: CloudProviders | null;
  title?: React.ReactNode;
  text: string;
}) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      className="eui-textTruncate"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip delay="long" content={provider ?? 'Unknown'}>
          <EuiIcon
            type={(provider && cloudIcons[provider]) || cloudIcons.unknownProvider}
            size="m"
            title={text}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-textTruncate">
        {title ?? (
          <EuiText size="relative" className="eui-textTruncate">
            {text}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
