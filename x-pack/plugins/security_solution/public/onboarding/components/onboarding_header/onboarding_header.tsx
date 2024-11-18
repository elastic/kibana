/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  COLOR_MODES_STANDARD,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useCurrentUser } from '../../../common/lib/kibana/hooks';
import { useOnboardingHeaderStyles } from './onboarding_header.styles';
import rocketImage from './images/header_rocket.png';
import rocketDarkImage from './images/header_rocket_dark.png';
import { TeammatesCard } from './cards/teammates_card';
import { VideoCard } from './cards/video_card';
import { DemoCard } from './cards/demo_card';
import * as i18n from './translations';

export const OnboardingHeader = React.memo(() => {
  const currentUser = useCurrentUser();
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  const styles = useOnboardingHeaderStyles();

  // Full name could be null, user name should always exist
  const currentUserName = currentUser?.fullName || currentUser?.username;

  return (
    <>
      <EuiFlexGroup justifyContent="center" alignItems="center" className={styles}>
        <EuiFlexItem grow={false}>
          <EuiImage
            src={isDarkMode ? rocketDarkImage : rocketImage}
            size={128}
            alt={i18n.GET_STARTED_DATA_INGESTION_HUB_SUBTITLE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="onboardingHeaderTitleWrapper">
          {currentUserName && (
            <EuiTitle size="xs" className="onboardingHeaderGreetings">
              <span>{i18n.GET_STARTED_PAGE_TITLE(currentUserName)}</span>
            </EuiTitle>
          )}
          <EuiSpacer size="s" />
          <EuiTitle size="l">
            <h1>{i18n.GET_STARTED_DATA_INGESTION_HUB_SUBTITLE}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m" color="subdued">
            <span>{i18n.GET_STARTED_DATA_INGESTION_HUB_DESCRIPTION}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup justifyContent="center" alignItems="center" wrap>
        <EuiFlexItem>
          <VideoCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
        <EuiFlexItem>
          <TeammatesCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
        <EuiFlexItem>
          <DemoCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
OnboardingHeader.displayName = 'OnboardingHeader';
