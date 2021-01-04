/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { SourceDataItem } from '../../../../types';
import { getSourcesPath } from '../../../../routes';

import {
  CONFIGURED_SOURCES_LIST_UNCONNECTED_TOOLTIP,
  CONFIGURED_SOURCES_LIST_ACCOUNT_ONLY_TOOLTIP,
  CONFIGURED_SOURCES_CONNECT_BUTTON,
  CONFIGURED_SOURCES_EMPTY_STATE,
  CONFIGURED_SOURCES_TITLE,
  CONFIGURED_SOURCES_EMPTY_BODY,
} from './constants';

interface ConfiguredSourcesProps {
  sources: SourceDataItem[];
  isOrganization: boolean;
}

export const ConfiguredSourcesList: React.FC<ConfiguredSourcesProps> = ({
  sources,
  isOrganization,
}) => {
  const unConnectedTooltip = (
    <span
      className="source-card-configured__not-connected-tooltip"
      data-test-subj="UnConnectedTooltip"
    >
      <EuiToolTip position="top" content={CONFIGURED_SOURCES_LIST_UNCONNECTED_TOOLTIP}>
        <EuiToken iconType="tokenException" color="orange" shape="circle" fill="light" />
      </EuiToolTip>
    </span>
  );

  const accountOnlyTooltip = (
    <span
      className="source-card-configured__not-connected-tooltip"
      data-test-subj="AccountOnlyTooltip"
    >
      <EuiToolTip position="top" content={CONFIGURED_SOURCES_LIST_ACCOUNT_ONLY_TOOLTIP}>
        <EuiToken iconType="tokenException" color="green" shape="circle" fill="light" />
      </EuiToolTip>
    </span>
  );

  const visibleSources = (
    <EuiFlexGrid columns={2} gutterSize="s" responsive={false} className="source-grid-configured">
      {sources.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
        <React.Fragment key={i}>
          <EuiFlexItem>
            <EuiPanel paddingSize="s">
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
                    <EuiButtonEmptyTo to={`${getSourcesPath(addPath, isOrganization)}/connect`}>
                      {CONFIGURED_SOURCES_CONNECT_BUTTON}
                    </EuiButtonEmptyTo>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </React.Fragment>
      ))}
    </EuiFlexGrid>
  );

  const emptyState = (
    <p data-test-subj="ConfiguredSourceEmptyState">{CONFIGURED_SOURCES_EMPTY_STATE}</p>
  );

  return (
    <>
      <EuiTitle size="s">
        <h2>{CONFIGURED_SOURCES_TITLE}</h2>
      </EuiTitle>
      <EuiText>
        <p>{CONFIGURED_SOURCES_EMPTY_BODY}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {sources.length > 0 ? visibleSources : emptyState}
      <EuiSpacer size="xxl" />
    </>
  );
};
