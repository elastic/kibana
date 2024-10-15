/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useFooterStyles } from './onboarding_footer.styles';
import { footerItems } from './footer_items';
import { trackOnboardingLinkClick } from '../../common/lib/telemetry';
import { TELEMETRY_FOOTER_LINK } from './constants';

export const OnboardingFooter = React.memo(() => {
  const styles = useFooterStyles();
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" className={styles}>
      {footerItems.map(({ id, title, icon, description, link }) => (
        <LinkItem
          id={id}
          key={`footer-${id}`}
          title={title}
          icon={icon}
          description={description}
          link={link}
        />
      ))}
    </EuiFlexGroup>
  );
});
OnboardingFooter.displayName = 'OnboardingFooter';

interface LinkItemProps {
  id: string;
  title: string;
  icon: string;
  description: string;
  link: { href: string; title: string };
}

const LinkItem = React.memo<LinkItemProps>(({ id, title, icon, description, link }) => {
  const onClickWithReport = useCallback<React.MouseEventHandler>(() => {
    trackOnboardingLinkClick(`${TELEMETRY_FOOTER_LINK}_${id}`);
    window.open(link.href, '_blank');
  }, [id, link.href]);

  return (
    <EuiFlexItem>
      <img src={icon} alt={title} height="64" width="64" />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" className="itemTitle">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{description}</EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <EuiLink onClick={onClickWithReport}>{link.title}</EuiLink>
      </EuiText>
    </EuiFlexItem>
  );
});

LinkItem.displayName = 'LinkItem';
