/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme, EuiCard, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IntegrationSettings } from '../../types';
import * as i18n from './translations';

const useCardCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    margin-top: calc(
      ${euiTheme.size.m} + 7px
    ); // To align with title input that has a margin-top of 4px to the label

    min-height: 127px;

    [class*='euiCard__content'] {
      display: flex;
      flex-direction: column;
      block-size: 100%;
    }

    [class*='euiCard__description'] {
      flex-grow: 1;
    }
  `;
};

interface PackageCardPreviewProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const PackageCardPreview = React.memo<PackageCardPreviewProps>(({ integrationSettings }) => {
  const cardCss = useCardCss();
  return (
    <EuiCard
      css={cardCss}
      data-test-subj="packageCardPreview"
      layout="horizontal"
      title={integrationSettings?.title ?? ''}
      description={integrationSettings?.description ?? ''}
      titleSize="xs"
      hasBorder
      icon={
        <EuiIcon
          size={'xl'}
          data-test-subj="packageCardPreviewIcon"
          type={
            integrationSettings?.logo
              ? `data:image/svg+xml;base64,${integrationSettings.logo}`
              : 'package'
          }
        />
      }
      betaBadgeProps={{
        label: i18n.PREVIEW,
        tooltipContent: i18n.PREVIEW_TOOLTIP,
      }}
    />
  );
});
PackageCardPreview.displayName = 'PackageCardPreview';
