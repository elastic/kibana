/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import * as i18n from '../translations';
import { useKibana } from '../../../utils/kibana_react';

const title = <h2 data-test-subj="license-prompt-title">{i18n.UPGRADE_TO_PLATINUM}</h2>;

export const LicensePrompt = React.memo(() => {
  const { application } = useKibana().services;

  return (
    <EuiPageTemplate.EmptyPrompt
      title={title}
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>{i18n.UPGRADE_TO_PLATINUM_SUBTITLE}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="license-prompt-upgrade"
                  key="upgrade-subscription-button"
                  target="_blank"
                  href="https://www.elastic.co/subscriptions"
                >
                  {i18n.UPGRADE_SUBSCRIPTION}
                </EuiButtonEmpty>
                ,
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="license-prompt-trial"
                  key="start-trial-button"
                  target="_blank"
                  href={application.getUrlForApp('management', {
                    path: 'stack/license_management/home',
                  })}
                >
                  {i18n.START_TRIAL}
                </EuiButton>
                ,
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
});
LicensePrompt.displayName = 'LicensePrompt';
