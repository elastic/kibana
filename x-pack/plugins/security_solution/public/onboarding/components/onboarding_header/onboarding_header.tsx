/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useCurrentUser } from '../../../common/lib/kibana/hooks';
import { PAGE_CONTENT_WIDTH } from '../../constants';

export const OnboardingHeader = React.memo(() => {
  const currentUser = useCurrentUser();

  // Full name could be null, user name should always exist
  const currentUserName = currentUser?.fullName || currentUser?.username;

  return (
    <KibanaPageTemplate.Section
      grow={true}
      restrictWidth={PAGE_CONTENT_WIDTH}
      data-test-subj="onboarding-header"
      paddingSize="xl"
      // className={stepsSectionStyles}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          {currentUserName && (
            <EuiTitle size="s" data-test-subj="onboarding-header-greetings">
              <span>
                {'Hi '}
                {currentUserName}
              </span>
            </EuiTitle>
          )}
          <EuiSpacer size="s" />
          {'// TODO: Header goes here'}
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
});
OnboardingHeader.displayName = 'OnboardingHeader';
