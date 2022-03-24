/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AnomalyDetectionSettings } from './anomaly_detection_settings';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';

export const Settings: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;
  return (
    <Fragment>
      <div data-test-subj="mlPageSettings">
        <MlPageHeader>
          <FormattedMessage id="xpack.ml.settings.title" defaultMessage="Settings" />
        </MlPageHeader>
        <AnomalyDetectionSettings />
      </div>
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
