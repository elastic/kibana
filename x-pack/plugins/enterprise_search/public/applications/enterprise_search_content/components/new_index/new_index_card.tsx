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
  disabled: boolean;
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

const METHOD_CARD_OPTIONS: Record<INGESTION_METHOD_IDS, MethodCardOptions> = {
  [INGESTION_METHOD_IDS.CRAWLER]: {
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
          defaultMessage: 'Use a web crawler',
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
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.methodCard.connector.description',
      {
        defaultMessage:
          'Extract, transform, index and sync data from a data source via native or customized connectors',
      }
    ),
    footer: {
      buttonLabel: i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodCard.connector.label',
        {
          defaultMessage: 'Use a connector',
        }
      ),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.CONNECTOR),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.connector.title', {
      defaultMessage: 'Connector',
    }),
  },
  [INGESTION_METHOD_IDS.API]: {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.methodCard.api.description',
      {
        defaultMessage: 'Add documents programmatically by connecting with the API',
      }
    ),
    footer: {
      buttonLabel: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.api.label', {
        defaultMessage: 'Use the API',
      }),
    },
    icon: getIngestionMethodIconType(INGESTION_METHOD_IDS.API),
    title: i18n.translate('xpack.enterpriseSearch.content.newIndex.methodCard.api.title', {
      defaultMessage: 'API',
    }),
  },
};
export const NewIndexCard: React.FC<NewIndexCardProps> = ({
  disabled,
  onSelect,
  isSelected,
  type,
}) => {
  if (!METHOD_CARD_OPTIONS[type]) {
    return null;
  }
  const { icon, title, description, footer } = METHOD_CARD_OPTIONS[type];

  return (
    <EuiCard
      isDisabled={disabled}
      data-test-subj="entSearch-content-newIndexCard-cardBody"
      hasBorder
      icon={<EuiIcon type={icon} size="xxl" />}
      title={title}
      description={<EuiTextColor color="subdued">{description}</EuiTextColor>}
      footer={
        <>
          {footer.label && (
            <>
              <EuiBadge color="hollow">{footer.label}</EuiBadge>
              <EuiSpacer size="m" />
            </>
          )}
          <EuiButton
            isDisabled={disabled}
            data-test-subj={`entSearchContent-newIndexCard-button-${type}`}
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
