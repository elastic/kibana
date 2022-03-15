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

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic } from './add_source_logic';

interface ConfigurationChoiceProps {
  sourceData: SourceDataItem;
  goToInternalStep?: () => void;
}

interface CardProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  betaBadgeLabel?: string;
}

export const ConfigurationChoice: React.FC<ConfigurationChoiceProps> = ({
  sourceData: {
    name,
    serviceType,
    externalConnectorAvailable,
    internalConnectorAvailable,
    customConnectorAvailable,
  },
  goToInternalStep,
}) => {
  const { isOrganization } = useValues(AppLogic);
  const { sourceConfigData } = useValues(AddSourceLogic);
  const { categories } = sourceConfigData;
  const goToInternal = goToInternalStep
    ? goToInternalStep
    : () =>
        KibanaLogic.values.navigateToUrl(
          `${getSourcesPath(
            `${getSourcesPath(getAddPath(serviceType), isOrganization)}/internal`,
            isOrganization
          )}/`
        );
  const goToExternal = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/external`,
        isOrganization
      )}/`
    );
  const goToCustom = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/custom`,
        isOrganization
      )}/`
    );

  const ConnectorCard: React.FC<CardProps> = ({
    title,
    description,
    buttonText,
    onClick,
    betaBadgeLabel,
  }: CardProps) => (
    <EuiFlexItem grow>
      <EuiCard
        hasBorder
        title={title}
        description={description}
        betaBadgeProps={{ label: betaBadgeLabel }}
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
        defaultMessage: 'Default connector',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.description',
      {
        defaultMessage: 'Use our out-of-the-box connector to get started quickly.',
      }
    ),
    buttonText: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.button',
      {
        defaultMessage: 'Connect',
      }
    ),
    onClick: goToInternal,
  };

  const externalConnectorProps: CardProps = {
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.title',
      {
        defaultMessage: 'Custom connector',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.description',
      {
        defaultMessage: 'Set up a custom connector for more configurability and control.',
      }
    ),
    buttonText: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.button',
      {
        defaultMessage: 'Instructions',
      }
    ),
    onClick: goToExternal,
    betaBadgeLabel: i18n.translate(
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
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexStart" direction="row" responsive={false}>
        {internalConnectorAvailable && <ConnectorCard {...internalConnectorProps} />}
        {externalConnectorAvailable && <ConnectorCard {...externalConnectorProps} />}
        {customConnectorAvailable && <ConnectorCard {...customConnectorProps} />}
      </EuiFlexGroup>
    </>
  );
};
