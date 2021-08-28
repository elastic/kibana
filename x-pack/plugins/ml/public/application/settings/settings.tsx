/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { Fragment } from 'react';
import { HelpMenu } from '../components/help_menu/help_menu';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../contexts/kibana/kibana_context';
import { AnomalyDetectionSettings } from './anomaly_detection_settings';

export const Settings: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;
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
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
