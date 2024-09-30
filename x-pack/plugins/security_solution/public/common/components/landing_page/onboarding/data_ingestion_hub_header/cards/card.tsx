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
import classNames from 'classnames';
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

export const Card: React.FC<CardProps> = React.memo((props) => {
  const { icon, title, description, children, onClick, href, target } = props;

  const cardStyles = useCardStyles();
  const cardClassName = classNames(cardStyles, 'headerCard');

  return (
    <EuiCard
      className={cardClassName}
      onClick={onClick}
      href={href}
      target={target}
      data-test-subj="data-ingestion-header-card"
      layout="horizontal"
      titleSize="xs"
      icon={
        <img
          data-test-subj="data-ingestion-header-card-icon"
          className="headerCardImage"
          src={icon}
          alt={title}
        />
      }
      title={
        <EuiTitle className="headerCardTitle">
          <h3>{title}</h3>
        </EuiTitle>
      }
      description={<p className="headerCardDescription">{description}</p>}
    >
      <div className="headerCardContent">{children}</div>
    </EuiCard>
  );
});

Card.displayName = 'Card';
