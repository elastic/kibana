/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import classnames from 'classnames';
import {
  GET_STARTED_PAGE_TITLE,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_DESCRIPTION,
  CURRENT_PLAN_LABEL,
} from '../translations';
import { ProductTierBadge } from './product_tier_badge';
import { useWelcomeHeaderStyles } from '../styles/welcome_header.styles';
import type { ProductTier } from '../configs';
import { useProjectFeaturesUrl } from '../hooks/use_project_features_url';
import { useCurrentUser } from '../../../../lib/kibana';

const WelcomeHeaderComponent: React.FC<{ productTier?: ProductTier }> = ({ productTier }) => {
  const userName = useCurrentUser();
  const projectFeaturesUrl = useProjectFeaturesUrl();
  const {
    headerContentStyles,
    headerStyles,
    headerTitleStyles,
    headerSubtitleStyles,
    headerDescriptionStyles,
    currentPlanWrapperStyles,
    currentPlanTextStyles,
    projectFeaturesUrlStyles,
  } = useWelcomeHeaderStyles();

  const headerSubtitleClassNames = classnames('eui-displayBlock', headerSubtitleStyles);
  const headerDescriptionClassNames = classnames('eui-displayBlock', headerDescriptionStyles);
  const currentPlanWrapperClassNames = classnames(
    'eui-displayInlineBlock',
    currentPlanWrapperStyles
  );
  const projectFeaturesUrlClassNames = classnames('eui-alignMiddle', projectFeaturesUrlStyles);

  return (
    <EuiFlexGroup className={headerStyles} data-test-subj="welcome-header">
      <EuiFlexItem grow={false} className={headerContentStyles}>
        {userName?.username && (
          <EuiTitle size="l" className={headerTitleStyles}>
            <span>{GET_STARTED_PAGE_TITLE(userName.username)}</span>
          </EuiTitle>
        )}
        <EuiSpacer size="s" />
        <span className={headerSubtitleClassNames}>{GET_STARTED_PAGE_SUBTITLE}</span>
        <EuiSpacer size="s" />
        <span className={headerDescriptionClassNames}>{GET_STARTED_PAGE_DESCRIPTION}</span>
        {productTier && projectFeaturesUrl && (
          <>
            <EuiSpacer size="l" />
            <div>
              <div className={currentPlanWrapperClassNames}>
                <span className={currentPlanTextStyles}>{CURRENT_PLAN_LABEL}</span>
                <ProductTierBadge productTier={productTier} />

                <EuiButtonIcon
                  className={projectFeaturesUrlClassNames}
                  color="primary"
                  href={projectFeaturesUrl}
                  target="_blank"
                  aria-label={CURRENT_PLAN_LABEL}
                  iconType="gear"
                  size="xs"
                />
              </div>
            </div>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const WelcomeHeader = React.memo(WelcomeHeaderComponent);
