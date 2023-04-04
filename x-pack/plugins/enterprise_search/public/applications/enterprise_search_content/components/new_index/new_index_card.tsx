/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';

import { EuiCardProps, EuiIconProps, EuiTextColor } from '@elastic/eui';
import { EuiBadge, EuiButton, EuiCard, EuiIcon, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { getIngestionMethodIconType } from './utils';

export interface NewIndexCardProps {
  isSelected?: boolean;
  onSelect?: MouseEventHandler<HTMLButtonElement>;
  type: INGESTION_METHOD_IDS;
}

export interface MethodCardOptions {
  description: EuiCardProps['description'];
  footer: Record<string, string>;
  icon: EuiIconProps['type'];
  title: EuiCardProps['title'];
}

// TODO change i18n labels
const METHOD_CARD_OPTIONS: Record<INGESTION_METHOD_IDS, MethodCardOptions> = {
  [INGESTION_METHOD_IDS.CRAWLER]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.description',
      {
        defaultMessage: 'Discover, extract, index, and sync all of your website content',
      }
    ),
    footer: {
      buttonLabel: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label',
        {
          defaultMessage: 'Use a web crawler',
        }
      ),
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.label', {
        defaultMessage: 'No development required',
      }),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.CRAWLER),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.crawler.title', {
      defaultMessage: 'Web crawler',
    }),
  },
  [INGESTION_METHOD_IDS.CONNECTOR]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.description',
      {
        defaultMessage:
          'Use the connector framework to quickly build connectors for custom data sources',
      }
    ),
    footer: {
      buttonLabel: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.label',
        {
          defaultMessage: 'Use a connector',
        }
      ),
      label: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.footer',
        {
          defaultMessage: 'Development required',
        }
      ),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.CONNECTOR),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.connector.title', {
      defaultMessage: 'Connector',
    }),
  },
  [INGESTION_METHOD_IDS.API]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.buttonGroup.api.description',
      {
        defaultMessage: 'Add documents programmatically by connecting with the API',
      }
    ),
    footer: {
      buttonLabel: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.label', {
        defaultMessage: 'Use the API',
      }),
      label: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.footer', {
        defaultMessage: 'Some development required',
      }),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.API),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.buttonGroup.api.title', {
      defaultMessage: 'API',
    }),
  },
};
export const NewIndexCard: React.FC<NewIndexCardProps> = ({ onSelect, isSelected, type }) => {
  if (!METHOD_CARD_OPTIONS[type]) {
    return null;
  }
  const { icon, title, description, footer } = METHOD_CARD_OPTIONS[type];

  return (
    <EuiCard
      hasBorder
      icon={<EuiIcon type={icon} size="xxl" />}
      title={title}
      description={<EuiTextColor color="subdued">{description}</EuiTextColor>}
      footer={
        <>
          <EuiBadge color="hollow">{footer.label}</EuiBadge>
          <EuiSpacer size="m" />
          <EuiButton
            fullWidth
            onClick={onSelect}
            color={isSelected ? 'success' : 'primary'}
            iconType={isSelected ? 'checkInCircleFilled' : undefined}
          >
            {footer.buttonLabel}
          </EuiButton>
        </>
      }
    />
  );
};
