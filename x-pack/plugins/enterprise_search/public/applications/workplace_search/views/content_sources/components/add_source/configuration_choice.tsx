/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { AppLogic } from '../../../../app_logic';
import { getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { SourcesLogic } from '../../sources_logic';

import { AddSourceHeader } from './add_source_header';

interface ConfigurationChoiceProps {
  sourceData: SourceDataItem;
}

interface CardProps {
  title: string;
  description: string;
  buttonText: string;
  to: string;
  badgeLabel?: string;
  disabledMessage?: string;
}

export const ConfigurationChoice: React.FC<ConfigurationChoiceProps> = ({
  sourceData: {
    externalConnectorAvailable,
    customConnectorAvailable,
    name,
    categories = [],
    serviceType,
  },
}) => {
  const { isOrganization } = useValues(AppLogic);

  const { initializeSources, resetSourcesState } = useActions(SourcesLogic);

  const { externalConfigured } = useValues(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const internalTo = `${getSourcesPath(getAddPath(serviceType), isOrganization)}/`;
  const externalTo = `${getSourcesPath(
    getAddPath('external'), // TODO add serviceType after baseServiceType support
    isOrganization
  )}/connector_registration`;
  const customTo = `${getSourcesPath(getAddPath(serviceType), isOrganization)}/custom`;

  const ConnectorCard: React.FC<CardProps> = ({
    title,
    description,
    buttonText,
    to,
    badgeLabel,
    disabledMessage,
  }: CardProps) => (
    <EuiFlexItem grow>
      <EuiCard
        isDisabled={!!disabledMessage}
        hasBorder
        title={title}
        description={disabledMessage || description}
        betaBadgeProps={{ label: badgeLabel }}
        footer={
          <EuiButtonTo color="primary" to={to} isDisabled={!!disabledMessage}>
            {buttonText}
          </EuiButtonTo>
        }
      />
    </EuiFlexItem>
  );

  const internalConnectorProps: CardProps = {
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.title',
      {
        defaultMessage: 'Connector',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.description',
      {
        defaultMessage:
          'Use this connector to get started quickly without deploying additional infrastructure.',
      }
    ),
    buttonText: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.button',
      {
        defaultMessage: 'Connect',
      }
    ),
    badgeLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.recommendedLabel',
      {
        defaultMessage: 'Recommended',
      }
    ),
    to: internalTo,
  };

  const externalConnectorProps: CardProps = {
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.title',
      {
        defaultMessage: 'Connector Package',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.description',
      {
        defaultMessage:
          'Deploy this connector package on self-managed infrastructure for advanced use cases.',
      }
    ),
    buttonText: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.button',
      {
        defaultMessage: 'Instructions',
      }
    ),
    to: externalTo,
    badgeLabel: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.betaLabel',
      {
        defaultMessage: 'Beta',
      }
    ),
  };

  const customConnectorProps: CardProps = {
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.title',
      {
        defaultMessage: 'Custom connector',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.description',
      {
        defaultMessage: 'Set up a custom connector for more configurability and control.',
      }
    ),
    buttonText: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.button',
      {
        defaultMessage: 'Instructions',
      }
    ),
    to: customTo,
  };

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexStart" direction="row" responsive={false}>
        <ConnectorCard {...internalConnectorProps} />
        {externalConnectorAvailable && (
          <ConnectorCard
            {...externalConnectorProps}
            disabledMessage={
              externalConfigured ? "You've already configured an external connector" : undefined
            }
          />
        )}
        {customConnectorAvailable && <ConnectorCard {...customConnectorProps} />}
      </EuiFlexGroup>
    </>
  );
};
