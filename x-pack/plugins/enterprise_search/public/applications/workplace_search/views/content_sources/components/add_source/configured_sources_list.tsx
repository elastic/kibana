/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Link } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';

import { SourceIcon } from 'workplace_search/components';
import { SourceDataItem } from 'workplace_search/types';
import { getSourcesPath } from 'workplace_search/utils/routePaths';

interface ConfiguredSourcesProps {
  sources: SourceDataItem[];
  isOrganization?: boolean;
}

export const ConfiguredSourcesList: React.FC<ConfiguredSourcesProps> = ({
  sources,
  isOrganization,
}) => {
  const unConnectedTooltip = (
    <span className="source-card-configured__not-connected-tooltip">
      <EuiToolTip position="top" content="No connected sources">
        <EuiToken iconType="tokenException" color="orange" shape="circle" fill="light" />
      </EuiToolTip>
    </span>
  );

  const accountOnlyTooltip = (
    <span className="source-card-configured__not-connected-tooltip">
      <EuiToolTip
        position="top"
        content="Private content source. Each user must add the content source from their own personal dashboard."
      >
        <EuiToken iconType="tokenException" color="green" shape="circle" fill="light" />
      </EuiToolTip>
    </span>
  );

  const visibleSources = (
    <EuiFlexGrid columns={2} gutterSize="s" responsive={false} className="source-grid-configured">
      {sources.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
        <React.Fragment key={i}>
          <EuiFlexItem>
            <div className="source-card-configured euiCard">
              <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
                <EuiFlexItem>
                  <EuiFlexGroup
                    justifyContent="flexStart"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <SourceIcon
                        serviceType={serviceType}
                        name={name}
                        className="source-card-configured__icon"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <h4>
                          {name}&nbsp;
                          {!connected &&
                            !accountContextOnly &&
                            isOrganization &&
                            unConnectedTooltip}
                          {accountContextOnly && isOrganization && accountOnlyTooltip}
                        </h4>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {(!isOrganization || (isOrganization && !accountContextOnly)) && (
                  <EuiFlexItem grow={false}>
                    <Link to={`${getSourcesPath(addPath, isOrganization)}/connect`}>
                      <EuiButtonEmpty>Connect</EuiButtonEmpty>
                    </Link>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
          </EuiFlexItem>
        </React.Fragment>
      ))}
    </EuiFlexGrid>
  );

  const emptyState = <p>There are no configured sources matching your query.</p>;

  return (
    <>
      <EuiTitle size="s">
        <h2>Configured content sources</h2>
      </EuiTitle>
      <EuiText>
        <p>Configured and ready for connection.</p>
      </EuiText>
      <EuiSpacer size="m" />
      {sources.length > 0 ? visibleSources : emptyState}
      <EuiSpacer size="xxl" />
    </>
  );
};
