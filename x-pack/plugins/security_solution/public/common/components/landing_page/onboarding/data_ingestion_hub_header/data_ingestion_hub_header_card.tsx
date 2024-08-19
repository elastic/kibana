/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiLink, EuiTitle } from '@elastic/eui';
import type { Card } from './cards';
import { useDataIngestionHubHeaderCardStyles } from '../styles/data_ingestion_hub_header_card.styles';

interface DataIngestionHubHeaderComponentCardProps {
  card: Card;
}

const DataIngestionHubHeaderCardComponent: React.FC<DataIngestionHubHeaderComponentCardProps> = (
  props
) => {
  const { card } = props;

  const IMAGE_WIDTH = 64;

  const { cardStyle, cardTitleStyle, cardLinkStyle, cardDescriptionStyle } =
    useDataIngestionHubHeaderCardStyles();

  return (
    <EuiCard
      onClick={() => {}}
      className={cardStyle}
      layout="horizontal"
      titleSize="xs"
      icon={<img src={card.icon} alt={card.title} height={IMAGE_WIDTH} width={IMAGE_WIDTH} />}
      title={
        <EuiTitle>
          <h3 className={cardTitleStyle}>{card.title}</h3>
        </EuiTitle>
      }
      description={<p className={cardDescriptionStyle}>{card.description}</p>}
    >
      <EuiLink href={card.link.href} external={true} target="_blank" className={cardLinkStyle}>
        {card.link.title}
      </EuiLink>
    </EuiCard>
  );
};

export const DataIngestionHubHeaderCard = React.memo(DataIngestionHubHeaderCardComponent);
