/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { OnboardingCardContentWrapper } from './card_content_wrapper';
import { useCardContentImagePanelStyles } from './card_content_image_panel.styles';

export const IMAGE_WIDTH = 540;

export const OnboardingCardContentImagePanel = React.memo<
  PropsWithChildren<{ imageSrc: string; imageAlt: string }>
>(({ children, imageSrc, imageAlt }) => {
  const styles = useCardContentImagePanelStyles();
  return (
    <OnboardingCardContentWrapper>
      <EuiPanel hasShadow={false} hasBorder paddingSize="m" className={styles}>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem>{children}</EuiFlexItem>
          <EuiFlexItem className="cardSpacer" grow={false}>
            <EuiSpacer size="xl" />
          </EuiFlexItem>
          <EuiFlexItem className="cardImage" grow={false}>
            <img src={imageSrc} alt={imageAlt} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </OnboardingCardContentWrapper>
  );
});
OnboardingCardContentImagePanel.displayName = 'OnboardingCardContentImagePanel';
