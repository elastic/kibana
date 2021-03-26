/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import {
  CONFIGURED_SOURCES_CONNECT_BUTTON,
  CONFIGURED_SOURCES_EMPTY_STATE,
  CONFIGURED_ORG_SOURCES_BODY,
  CONFIGURED_ORG_SOURCES_TITLE,
  CONFIGURED_PRIVATE_SOURCES_BODY,
  CONFIGURED_PRIVATE_SOURCES_TITLE,
} from './constants';

interface ConfiguredSourcesProps {
  sources: SourceDataItem[];
  isOrganization: boolean;
}

export const ConfiguredSourcesList: React.FC<ConfiguredSourcesProps> = ({
  sources,
  isOrganization,
}) => {
  const ButtonConnect = ({addPath}: {addPath: string}) => (
    <EuiButtonTo to={`${getSourcesPath(addPath, isOrganization)}/connect`}>
      {CONFIGURED_SOURCES_CONNECT_BUTTON}
    </EuiButtonTo>
  )
  const ButtonDisabled = () => <EuiButton disabled>Available in personal dashboard</EuiButton>

  const ConfiguredSource = ({
    accountContextOnly,
    addPath, 
    connected,
    name,
    serviceType
  }: {
    accountContextOnly: boolean,
    addPath: string,
    connected: boolean,
    name: string,
    serviceType: string
  }) => {
    const privateSource = (!isOrganization || (isOrganization && !accountContextOnly))
    return (
      <EuiFlexItem>
        <EuiCard
          description={!privateSource ? 'Private Source' : connected ? 'At least one source connected' : 'No sources connected'}
          display={'plain'}
          icon={<SourceIcon serviceType={serviceType} name={name} size="xxl" />}
          paddingSize={'l'}
          title={name}
          titleSize={'xs'}
          footer={privateSource ? <ButtonConnect addPath={addPath} /> : <ButtonDisabled />}
        />
      </EuiFlexItem>
    )
  }

  const sourcesPrivate = sources.filter(i => i.privateSourcesEnabled)
  const sourcesShared = sources.filter(i => !i.privateSourcesEnabled)

  const visibleSources = (
    <>
      <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
        <EuiText size="s">
          <h3>{CONFIGURED_ORG_SOURCES_TITLE}</h3>
          <p>{CONFIGURED_ORG_SOURCES_BODY}</p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGrid columns={3} responsive={false} className="source-grid-configured">
          {sourcesShared.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
            <ConfiguredSource accountContextOnly={accountContextOnly} addPath={addPath} connected={connected} name={name} serviceType={serviceType} key={i} />
          ))}
        </EuiFlexGrid>
      </EuiPanel>
      <EuiSpacer size="xl" />
      <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
        <EuiText size="s">
          <h3>{CONFIGURED_PRIVATE_SOURCES_TITLE}</h3>
          <p>{CONFIGURED_PRIVATE_SOURCES_BODY}</p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGrid columns={3} responsive={false} className="source-grid-configured">
          {sourcesPrivate.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
            <ConfiguredSource accountContextOnly={accountContextOnly} addPath={addPath} connected={connected} name={name} serviceType={serviceType} key={i} />
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );

  const emptyState = (
    <p data-test-subj="ConfiguredSourceEmptyState">{CONFIGURED_SOURCES_EMPTY_STATE}</p>
  );

  return (
    <>
      <EuiSpacer size="s" />
      {sources.length > 0 ? visibleSources : emptyState}
      <EuiSpacer size="xxl" />
    </>
  );
};
