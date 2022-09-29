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
import { getAddPath, getEditPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { hasCustomConnectorOption, hasExternalConnectorOption } from '../../source_data';

import { SourcesLogic } from '../../sources_logic';

import { AddSourceHeader } from './add_source_header';

interface CardProps {
  title: string;
  description: string;
  buttonText: string;
  to: string;
  badgeLabel?: string;
  disabledMessage?: string;
}

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
      betaBadgeProps={badgeLabel ? { label: badgeLabel } : undefined}
      footer={
        <EuiButtonTo color="primary" to={to} isDisabled={!!disabledMessage}>
          {buttonText}
        </EuiButtonTo>
      }
    />
  </EuiFlexItem>
);

interface ConfigurationChoiceProps {
  sourceData: SourceDataItem;
}

export const ConfigurationChoice: React.FC<ConfigurationChoiceProps> = ({
  sourceData: { name, categories = [], serviceType },
}) => {
  const externalConnectorAvailable = hasExternalConnectorOption(serviceType);
  const customConnectorAvailable = hasCustomConnectorOption(serviceType);

  const { isOrganization } = useValues(AppLogic);

  const { initializeSources, resetSourcesState } = useActions(SourcesLogic);

  const { externalConfigured } = useValues(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const internalTo = `${getSourcesPath(getAddPath(serviceType), isOrganization)}/`;
  const externalTo = `${getSourcesPath(
    getAddPath('external', serviceType),
    isOrganization
  )}/connector_registration`;
  const customTo = `${getSourcesPath(getAddPath('custom', serviceType), isOrganization)}`;

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
        defaultMessage: 'Technical preview',
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
        <ConnectorCard {...internalConnectorProps} data-test-subj="InternalConnectorCard" />
        {externalConnectorAvailable &&
          (externalConfigured ? (
            <ConnectorCard
              {...externalConnectorProps}
              buttonText={i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.reviewButtonLabel',
                {
                  defaultMessage: 'Review the connector package',
                }
              )}
              to={getEditPath('external')}
              data-test-subj="ExternalConnectorCard"
            />
          ) : (
            <ConnectorCard {...externalConnectorProps} data-test-subj="ExternalConnectorCard" />
          ))}
        {customConnectorAvailable && (
          <ConnectorCard {...customConnectorProps} data-test-subj="CustomConnectorCard" />
        )}
      </EuiFlexGroup>
    </>
  );
};
