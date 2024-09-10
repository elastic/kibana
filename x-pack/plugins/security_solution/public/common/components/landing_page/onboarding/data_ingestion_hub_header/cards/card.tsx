/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiCardProps } from '@elastic/eui';
import { EuiCard, EuiTitle } from '@elastic/eui';
import { useCardStyles } from './card.styles';

interface CardProps {
  icon: string;
  title: string;
  description: string;
  children: ReactNode;
  onClick?: () => void;
  href?: EuiCardProps['href'];
  target?: EuiCardProps['target'];
}

const IMAGE_WIDTH = 64;

export const Card: React.FC<CardProps> = React.memo((props) => {
  const { icon, title, description, children, onClick, href, target } = props;

  const { cardBodyStyle, cardTitleStyle, cardDescriptionStyle } = useCardStyles();

  return (
    <EuiCard
      className={cardBodyStyle}
      onClick={onClick}
      href={href}
      target={target}
      data-test-subj="data-ingestion-header-card"
      layout="horizontal"
      titleSize="xs"
      icon={
        <img
          data-test-subj="data-ingestion-header-card-icon"
          src={icon}
          alt={title}
          height={IMAGE_WIDTH}
          width={IMAGE_WIDTH}
        />
      }
      title={
        <EuiTitle>
          <h3 className={cardTitleStyle}>{title}</h3>
        </EuiTitle>
      }
      description={<p className={cardDescriptionStyle}>{description}</p>}
    >
      {children}
    </EuiCard>
  );
});

Card.displayName = 'Card';
