/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';
import { hasMultipleConnectorOptions } from '../../../../utils';

import {
  CONFIGURED_SOURCES_LIST_UNCONNECTED_TOOLTIP,
  CONFIGURED_SOURCES_LIST_ACCOUNT_ONLY_TOOLTIP,
  CONFIGURED_SOURCES_EMPTY_STATE,
  CONFIGURED_SOURCES_TITLE,
  CONFIGURED_SOURCES_EMPTY_BODY,
  ADD_SOURCE_ORG_SOURCES_TITLE,
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
    <EuiFlexGrid columns={3} gutterSize="m" className="source-grid-configured">
      {sources.map((sourceData, i) => {
        const { connected, accountContextOnly, name, serviceType, isBeta } = sourceData;
        return (
          <React.Fragment key={i}>
            <EuiFlexItem
              grow
              className="organizational-content-source-item"
              data-test-subj="ConfiguredSourcesListItem"
            >
              <EuiCard
                title=""
                betaBadgeProps={
                  isBeta
                    ? {
                        label: i18n.translate(
                          'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSourcesList.betaBadge',
                          {
                            defaultMessage: 'Beta',
                          }
                        ),
                      }
                    : undefined
                }
                paddingSize="none"
                hasBorder
              >
                <EuiSplitPanel.Outer color="plain" hasShadow={false}>
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
                  <EuiSplitPanel.Inner color="subdued" paddingSize="none">
                    {
                      // TODO: Remove this once external connectors are multi-tenant
                      // This prevents connecting more than one external content source
                      (serviceType !== 'external' || !connected) &&
                        (((!isOrganization || (isOrganization && !accountContextOnly)) && (
                          <EuiButtonEmptyTo
                            className="eui-fullWidth"
                            to={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/${
                              hasMultipleConnectorOptions(sourceData) ? '' : 'connect'
                            }`}
                          >
                            {!connected
                              ? i18n.translate(
                                  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.connectButton',
                                  {
                                    defaultMessage: 'Connect',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.connectAnotherButton',
                                  {
                                    defaultMessage: 'Connect another',
                                  }
                                )}
                          </EuiButtonEmptyTo>
                        )) || (
                          <EuiButtonEmpty className="eui-fullWidth" isDisabled>
                            {ADD_SOURCE_ORG_SOURCES_TITLE}
                          </EuiButtonEmpty>
                        ))
                    }
                  </EuiSplitPanel.Inner>
                </EuiSplitPanel.Outer>
              </EuiCard>
            </EuiFlexItem>
          </React.Fragment>
        );
      })}
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
