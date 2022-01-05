/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

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

  const organizationalContentSourceStyle = {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 1em'
  }

  const visibleSources = (
    <EuiFlexGrid columns={3} gutterSize="m" className="source-grid-configured">
      {sources.map(({ name, serviceType, addPath, connected, accountContextOnly }, i) => (
        <React.Fragment key={i}>
          <EuiFlexItem grow>

            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow>
                <EuiSplitPanel.Outer
                  display="plain"
                  hasShadow
                  hasBorder={true}
                  grow
                >
                  <EuiSplitPanel.Inner>

                    <EuiFlexGroup
                      justifyContent="center"
                      alignItems="center"
                      direction="column"
                      gutterSize="s"
                      responsive={false}
                    >
                      <EuiFlexItem>
                        <SourceIcon serviceType={serviceType} name={name} size="xxl" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <h4>
                            {name}
                            {!connected &&
                              !accountContextOnly &&
                              isOrganization &&
                              unConnectedTooltip}
                            {accountContextOnly && isOrganization && accountOnlyTooltip}
                          </h4>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>

                  </EuiSplitPanel.Inner>

                  <EuiSplitPanel.Inner
                    color="subdued"
                    paddingSize="none"
                  >

                    <EuiFlexGroup
                      justifyContent="center"
                      alignItems="center"
                      gutterSize="s"
                      responsive={false}
                    >

                      {(!isOrganization || (isOrganization && !accountContextOnly)) && (
                        <EuiFlexItem grow>
                          <EuiButtonEmptyTo to={`${getSourcesPath(addPath, isOrganization)}/connect`}>
                            {CONFIGURED_SOURCES_CONNECT_BUTTON}
                          </EuiButtonEmptyTo>
                        </EuiFlexItem>
                      ) || (
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" color="subdued" style={organizationalContentSourceStyle}>
                              <p>Add an organizational content source</p>
                            </EuiText>
                          </EuiFlexItem>
                        )}

                    </EuiFlexGroup>

                  </EuiSplitPanel.Inner>

                </EuiSplitPanel.Outer>
              </EuiFlexItem>
            </EuiFlexGroup>

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
        <h3>{CONFIGURED_SOURCES_TITLE}</h3>
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
