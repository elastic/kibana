/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGrid, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { SourceDataItem } from '../../../../types';

import { ConfiguredSource } from './configured_source';

import {
  CONFIGURED_SOURCES_EMPTY_STATE,
  CONFIGURED_ORG_SOURCES_TITLE,
  CONFIGURED_PRIVATE_SOURCES_BODY,
  CONFIGURED_PRIVATE_SOURCES_TITLE,
  CONFIGURED_ORG_SOURCES_BODY,
} from './constants';

interface ConfiguredSourcesProps {
  sources: SourceDataItem[];
  isOrganization: boolean;
}

export const ConfiguredSourcesList: React.FC<ConfiguredSourcesProps> = ({
  sources,
  isOrganization,
}) => {
  const sourcesPrivate = sources.filter((i) => i.accountContextOnly);
  const sourcesShared = sources.filter((i) => !i.accountContextOnly);

  const visibleSources = (
    <>
      <EuiPanel
        color="subdued"
        hasShadow={false}
        paddingSize="l"
        data-test-subj="ConfiguredSharedSourcesPanel"
      >
        <EuiText size="s">
          <h3>{CONFIGURED_ORG_SOURCES_TITLE}</h3>
          <p>{CONFIGURED_ORG_SOURCES_BODY}</p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGrid columns={3} responsive={false} className="source-grid-configured">
          {sourcesShared.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
            <ConfiguredSource
              accountContextOnly={accountContextOnly}
              addPath={addPath}
              connected={connected}
              name={name}
              serviceType={serviceType}
              key={i}
              isOrganization={isOrganization}
            />
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
        <EuiFlexGrid
          columns={3}
          responsive={false}
          className="source-grid-configured"
          data-test-subj="ConfiguredPrivateSourcesPanel"
        >
          {sourcesPrivate.map(
            ({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
              <ConfiguredSource
                accountContextOnly={accountContextOnly}
                addPath={addPath}
                connected={connected}
                name={name}
                serviceType={serviceType}
                key={i}
                isOrganization={isOrganization}
              />
            )
          )}
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
