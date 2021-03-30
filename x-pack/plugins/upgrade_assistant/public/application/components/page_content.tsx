/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useAppContext } from '../app_context';
import { ComingSoonPrompt } from './coming_soon_prompt';
import { UpgradeAssistantTabs } from './tabs';

export const PageContent: React.FunctionComponent = () => {
  const { kibanaVersionInfo, isReadOnlyMode } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  // Read-only mode will be enabled up until the last minor before the next major release
  if (isReadOnlyMode) {
    return <ComingSoonPrompt />;
  }

  return (
    <>
      <EuiPageHeader data-test-subj="upgradeAssistantPageContent">
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.upgradeAssistant.appTitle"
                defaultMessage="{version} Upgrade Assistant"
                values={{ version: `${nextMajor}.0` }}
              />
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>

      <UpgradeAssistantTabs />
    </>
  );
};
