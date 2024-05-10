/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { IngestionCard } from '../shared/ingestion_card/ingestion_card';

import { getIngestionMethodButtonIcon, getIngestionMethodIconType } from './utils';

export interface NewIndexCardProps {
  disabled: boolean;
  onSelect?: () => void;
  type: INGESTION_METHOD_IDS;
}

export interface MethodCardOptions {
  buttonIcon: EuiIconProps['type'];
  description: string;
  footer: Record<string, string>;
  icon: EuiIconProps['type'];
  title: string;
}

const METHOD_CARD_OPTIONS: Record<INGESTION_METHOD_IDS, MethodCardOptions> = {
  [INGESTION_METHOD_IDS.CRAWLER]: {
    buttonIcon: getIngestionMethodButtonIcon(INGESTION_METHOD_IDS.CRAWLER),
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.methodCard.crawler.description',
      {
        defaultMessage:
          'Discover, extract, and index searchable content from websites and knowledge bases',
      }
    ),
    footer: {
      buttonLabel: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodCard.crawler.label',
        {
          defaultMessage: 'Crawl URL',
        }
      ),
      label: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodCard.crawler.nocodeLabel',
        {
          defaultMessage: 'No code',
        }
      ),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.CRAWLER),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.crawler.title', {
      defaultMessage: 'Web crawler',
    }),
  },
  [INGESTION_METHOD_IDS.CONNECTOR]: {
    buttonIcon: getIngestionMethodButtonIcon(INGESTION_METHOD_IDS.CONNECTOR),
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.methodCard.connector.description',
      {
        defaultMessage: 'Extract, transform, index and sync data from a third-party data source',
      }
    ),
    footer: {
      buttonLabel: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodCard.connector.label',
        {
          defaultMessage: 'Choose a source connector',
        }
      ),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.CONNECTOR),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.connector.title', {
      defaultMessage: 'Connectors',
    }),
  },
  [INGESTION_METHOD_IDS.API]: {
    buttonIcon: getIngestionMethodButtonIcon(INGESTION_METHOD_IDS.API),
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.methodCard.api.description',
      {
        defaultMessage: 'Use the API to connect directly to your Elasticsearch index endpoint.',
      }
    ),
    footer: {
      buttonLabel: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.api.label', {
        defaultMessage: 'Create API Index',
      }),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.API),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.api.title', {
      defaultMessage: 'API',
    }),
  },
};

export const NewIndexCard: React.FC<NewIndexCardProps> = ({ disabled, onSelect, type }) => {
  if (!METHOD_CARD_OPTIONS[type]) {
    return null;
  }
  const { buttonIcon, icon, title, description, footer } = METHOD_CARD_OPTIONS[type];

  return (
    <IngestionCard
      isDisabled={disabled}
      data-test-subj="entSearch-content-newIndexCard-cardBody"
      logo={icon}
      buttonIcon={buttonIcon}
      buttonLabel={footer.buttonLabel}
      title={title}
      description={description}
      onClick={onSelect}
    />
  );
};
