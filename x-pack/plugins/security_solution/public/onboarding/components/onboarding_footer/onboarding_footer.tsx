/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useFooterStyles } from './onboarding_footer.styles';
import { footerItems } from './footer_items';

export const OnboardingFooter = React.memo(() => {
  const styles = useFooterStyles();
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" className={styles}>
      {footerItems.map((item) => (
        <EuiFlexItem key={`footer-${item.key}`}>
          <img src={item.icon} alt={item.title} height="64" width="64" />
          <EuiSpacer size="m" />
          <EuiTitle size="xxs" className="itemTitle">
            <h3>{item.title}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{item.description}</EuiText>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <EuiLink href={item.link.href} target="_blank">
              {item.link.title}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
OnboardingFooter.displayName = 'OnboardingFooter';
