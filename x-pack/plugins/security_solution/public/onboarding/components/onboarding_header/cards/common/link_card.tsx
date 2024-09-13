/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiImage, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import classNames from 'classnames';
import { useCardStyles } from './link_card.styles';

interface LinkCardProps {
  icon: string;
  title: string;
  description: string;
  linkText: string;
  onClick?: () => void;
  href?: string;
  target?: string;
}

export const LinkCard: React.FC<LinkCardProps> = React.memo(
  ({ icon, title, description, onClick, href, target, linkText }) => {
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
        icon={
          <EuiImage
            data-test-subj="data-ingestion-header-card-icon"
            src={icon}
            alt={title}
            size={64}
          />
        }
        title={
          <EuiTitle size="xxs" className="headerCardTitle">
            <h3>{title}</h3>
          </EuiTitle>
        }
        description={<EuiText size="xs">{description}</EuiText>}
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" className="headerCardLink">
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiLink href={href} onClick={onClick} target={target}>
            {linkText}
          </EuiLink>
        </EuiText>
      </EuiCard>
    );
  }
);

LinkCard.displayName = 'LinkCard';
