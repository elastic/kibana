/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';

import { useFooterStyles } from '../styles/footer.styles';
import { getFooter } from './footer';

const FooterComponent = () => {
  const { wrapperStyle, titleStyle, descriptionStyle, linkStyle } = useFooterStyles();
  const footer = useMemo(() => getFooter(), []);
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="none"
      className={wrapperStyle}
    >
      {footer.map((item) => (
        <EuiFlexItem key={`footer-${item.key}`}>
          <img src={item.icon} alt={item.title} height="64" width="64" />
          <EuiSpacer size="m" />
          <EuiTitle>
            <h3 className={titleStyle}>{item.title}</h3>
          </EuiTitle>
          <p className={descriptionStyle}>{item.description}</p>
          <EuiSpacer size="m" />
          <EuiLink href={item.link.href} external={true} target="_blank" className={linkStyle}>
            {item.link.title}
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const Footer = React.memo(FooterComponent);
