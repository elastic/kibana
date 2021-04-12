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

import {
  CONFIGURED_SOURCES_CONNECT_BUTTON,
  AVAILABLE_IN_PERSONAL_DASHBOARD_BUTTON,
  CONFIGURED_PRIVATE_SOURCE_CARD_DESCRIPTION,
  CONFIGURED_CONNECTED_ORG_SOURCE_CARD_DESCRIPTION,
  CONFIGURED_NOT_CONNECTED_ORG_SOURCE_CARD_DESCRIPTION,
} from './constants';

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
  const ButtonDisabled = () => (
    <EuiButton disabled>{AVAILABLE_IN_PERSONAL_DASHBOARD_BUTTON}</EuiButton>
  );

  const privateSource = !isOrganization || (isOrganization && !accountContextOnly);
  return (
    <EuiFlexItem>
      <EuiCard
        description={
          !privateSource
            ? CONFIGURED_PRIVATE_SOURCE_CARD_DESCRIPTION
            : connected
            ? CONFIGURED_CONNECTED_ORG_SOURCE_CARD_DESCRIPTION
            : CONFIGURED_NOT_CONNECTED_ORG_SOURCE_CARD_DESCRIPTION
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
