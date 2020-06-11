/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { AnomalyDetectionSettings } from './anomaly_detection_settings';

import { NavigationMenu } from '../components/navigation_menu';

export const Settings: FC = () => {
  return (
    <Fragment>
      <NavigationMenu tabId="settings" />
      <EuiPage className="mlSettingsPage" data-test-subj="mlPageSettings">
        <EuiPageBody>
          <EuiPageHeader className="mlSettingsPage__header">
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage id="xpack.ml.settings.title" defaultMessage="Settings" />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <AnomalyDetectionSettings />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
