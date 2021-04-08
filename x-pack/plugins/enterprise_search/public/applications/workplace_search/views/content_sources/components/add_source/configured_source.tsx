/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCard, EuiFlexItem } from '@elastic/eui';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { getSourcesPath } from '../../../../routes';

import { CONFIGURED_SOURCES_CONNECT_BUTTON } from './constants';

interface ConfiguredSourceProps {
  accountContextOnly: boolean;
  addPath: string;
  connected?: boolean;
  name: string;
  serviceType: string;
  isOrganization: boolean;
}

export const ConfiguredSource: React.FC<ConfiguredSourceProps> = ({
  accountContextOnly,
  addPath,
  connected,
  name,
  serviceType,
  isOrganization,
}) => {
  const ButtonConnect = () => (
    <EuiButtonTo to={`${getSourcesPath(addPath, isOrganization)}/connect`}>
      {CONFIGURED_SOURCES_CONNECT_BUTTON}
    </EuiButtonTo>
  );
  const ButtonDisabled = () => <EuiButton disabled>Available in personal dashboard</EuiButton>;

  const privateSource = !isOrganization || (isOrganization && !accountContextOnly);
  return (
    <EuiFlexItem>
      <EuiCard
        description={
          !privateSource
            ? 'Private Source'
            : connected
            ? 'At least one source connected'
            : 'No sources connected'
        }
        display={'plain'}
        icon={<SourceIcon serviceType={serviceType} name={name} size="xxl" />}
        paddingSize={'l'}
        title={name}
        titleSize={'xs'}
        footer={privateSource ? <ButtonConnect /> : <ButtonDisabled />}
      />
    </EuiFlexItem>
  );
};
