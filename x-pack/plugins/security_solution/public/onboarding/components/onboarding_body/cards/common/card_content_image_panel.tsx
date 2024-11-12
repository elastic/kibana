/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, type PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { OnboardingCardContentPanel } from './card_content_panel';
import { useCardContentImagePanelStyles } from './card_content_image_panel.styles';

export const OnboardingCardContentImagePanel = React.memo<
  PropsWithChildren<{
    media: { type: 'video' | 'image'; source: string; alt: string };
  }>
>(({ children, media: { type, source, alt } }) => {
  const styles = useCardContentImagePanelStyles();

  const renderMediaContent = useMemo(() => {
    if (type === 'video')
      return (
        <iframe
          allowFullScreen
          height="275px"
          width="488px"
          allow="autoplay"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          src={source}
          title={'title'}
        />
      );
    return <img src={source} alt={alt} />;
  }, [alt, source, type]);

  return (
    <OnboardingCardContentPanel className={styles}>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem className="cardSpacer" grow={false}>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
        <EuiFlexItem className="cardImage" grow={false}>
          {renderMediaContent}
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
});
OnboardingCardContentImagePanel.displayName = 'OnboardingCardContentImagePanel';
