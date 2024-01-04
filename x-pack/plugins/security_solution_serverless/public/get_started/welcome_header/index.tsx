/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { useUserName } from '../../common/hooks/use_user_name';
import { getProjectFeaturesUrl } from '../../navigation/links/util';

import {
  GET_STARTED_PAGE_TITLE,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_DESCRIPTION,
  CURRENT_PLAN_LABEL,
} from '../translations';
import { CONTENT_WIDTH } from '../helpers';
import { ProductTierBadge } from './product_tier_badge';
import { useKibana } from '../../common/services';
import type { ProductTier } from '../../../common/product';
import { useWelcomeHeaderStyles } from '../styles/welcome_header.styles';

const WelcomeHeaderComponent: React.FC<{ productTier?: ProductTier }> = ({ productTier }) => {
  const { euiTheme } = useEuiTheme();
  const userName = useUserName();
  const { cloud } = useKibana().services;
  const {
    headerStyles,
    headerTitleStyles,
    headerSubtitleStyles,
    headerDescriptionStyles,
    currentPlanWrapperStyles,
    currentPlanTextStyles,
  } = useWelcomeHeaderStyles();

  return (
    <EuiFlexGroup css={headerStyles} data-test-subj="welcome-header">
      <EuiFlexItem
        grow={false}
        css={css`
          width: ${CONTENT_WIDTH / 2}px;
        `}
      >
        {userName && (
          <EuiTitle size="l" css={headerTitleStyles}>
            <span>{GET_STARTED_PAGE_TITLE(userName)}</span>
          </EuiTitle>
        )}
        <EuiSpacer size="s" />
        <span css={headerSubtitleStyles} className="eui-displayBlock">
          {GET_STARTED_PAGE_SUBTITLE}
        </span>
        <EuiSpacer size="s" />
        <span className="eui-displayBlock" css={headerDescriptionStyles}>
          {GET_STARTED_PAGE_DESCRIPTION}
        </span>
        <EuiSpacer size="l" />
        <div>
          <div className="eui-displayInlineBlock" css={currentPlanWrapperStyles}>
            <span css={currentPlanTextStyles}>{CURRENT_PLAN_LABEL}</span>
            <ProductTierBadge productTier={productTier} />
            {productTier && (
              <EuiButtonIcon
                className="eui-alignMiddle"
                color="primary"
                href={getProjectFeaturesUrl(cloud)}
                target="_blank"
                aria-label={CURRENT_PLAN_LABEL}
                iconType="gear"
                size="xs"
                css={css`
                  padding-left: ${euiTheme.size.xs};
                `}
              />
            )}
          </div>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const WelcomeHeader = React.memo(WelcomeHeaderComponent);
