/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import classnames from 'classnames';
import {
  GET_STARTED_PAGE_TITLE,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_DESCRIPTION,
} from '../translations';
import { useWelcomeHeaderStyles } from '../styles/welcome_header.styles';
import type { ProductTier } from '../configs';
import { useProjectFeaturesUrl } from '../hooks/use_project_features_url';
import { useCurrentUser } from '../../../../lib/kibana';
import { CurrentPlan } from './current_plan';

const WelcomeHeaderComponent: React.FC<{ productTier?: ProductTier }> = ({ productTier }) => {
  const userName = useCurrentUser();

  // Full name could be null, user name should always exist
  const name = userName?.fullName ?? userName?.username;

  const projectFeaturesUrl = useProjectFeaturesUrl();

  const {
    headerContentStyles,
    headerStyles,
    headerTitleStyles,
    headerSubtitleStyles,
    headerDescriptionStyles,
  } = useWelcomeHeaderStyles();

  const headerSubtitleClassNames = classnames('eui-displayBlock', headerSubtitleStyles);
  const headerDescriptionClassNames = classnames('eui-displayBlock', headerDescriptionStyles);

  return (
    <EuiFlexGroup className={headerStyles} data-test-subj="welcome-header">
      <EuiFlexItem grow={false} className={headerContentStyles}>
        {name && (
          <EuiTitle
            size="l"
            className={headerTitleStyles}
            data-test-subj="welcome-header-greetings"
          >
            <span>{GET_STARTED_PAGE_TITLE(name)}</span>
          </EuiTitle>
        )}
        <EuiSpacer size="s" />
        <span className={headerSubtitleClassNames}>{GET_STARTED_PAGE_SUBTITLE}</span>
        <EuiSpacer size="s" />
        <span className={headerDescriptionClassNames}>{GET_STARTED_PAGE_DESCRIPTION}</span>
        <CurrentPlan productTier={productTier} projectFeaturesUrl={projectFeaturesUrl} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const WelcomeHeader = React.memo(WelcomeHeaderComponent);
