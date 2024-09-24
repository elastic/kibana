/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { Card } from '../card';

interface VideoCardProps {
  icon: string;
  title: string;
  description: string;
  href?: string;
  linkTitle: string;
}

export const LinkCard: React.FC<VideoCardProps> = React.memo((props) => {
  const { icon, title, description, href, linkTitle } = props;
  const { euiTheme } = useEuiTheme();

  return (
    <Card href={href} target="_blank" icon={icon} title={title} description={description}>
      <EuiLink
        href={href}
        external={true}
        target="_blank"
        className={css({
          fontSize: euiTheme.size.m,
          fontWeight: euiTheme.font.weight.medium,
          lineHeight: euiTheme.size.base,
        })}
      >
        {linkTitle}
      </EuiLink>
    </Card>
  );
});

LinkCard.displayName = 'LinkCard';
