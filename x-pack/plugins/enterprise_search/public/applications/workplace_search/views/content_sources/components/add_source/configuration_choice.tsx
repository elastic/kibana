/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import { getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { hasCustomConnectorOption, hasExternalConnectorOption } from '../../source_data';

import { AddSourceHeader } from './add_source_header';

interface ConfigurationChoiceProps {
  sourceData: SourceDataItem;
}

interface CardProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  badgeLabel?: string;
}

export const ConfigurationChoice: React.FC<ConfigurationChoiceProps> = ({
  sourceData: { name, categories, serviceType },
}) => {
  const externalConnectorAvailable = hasExternalConnectorOption(serviceType);
  const customConnectorAvailable = hasCustomConnectorOption(serviceType);

  const { isOrganization } = useValues(AppLogic);

  const goToInternal = () =>
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(getAddPath(serviceType), isOrganization)}/`);

  const goToExternal = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(getAddPath('external', serviceType), isOrganization)}/connector_config`
    );
  const goToCustom = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(getAddPath('custom', serviceType), isOrganization)}`
    );

  const ConnectorCard: React.FC<CardProps> = ({
    title,
    description,
    buttonText,
    onClick,
    badgeLabel,
  }: CardProps) => (
    <EuiFlexItem grow>
      <EuiCard
        hasBorder
        title={title}
        description={description}
        betaBadgeProps={{ label: badgeLabel }}
        footer={
          <EuiButton color="primary" onClick={onClick}>
            {buttonText}
          </EuiButton>
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
    onClick: goToInternal,
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
    onClick: goToExternal,
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
    onClick: goToCustom,
  };

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories || []} />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexStart" direction="row" responsive={false}>
        <ConnectorCard {...internalConnectorProps} />
        {externalConnectorAvailable && <ConnectorCard {...externalConnectorProps} />}
        {customConnectorAvailable && <ConnectorCard {...customConnectorProps} />}
      </EuiFlexGroup>
    </>
  );
};
