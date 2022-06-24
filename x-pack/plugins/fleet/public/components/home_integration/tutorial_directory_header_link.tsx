/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { TutorialDirectoryHeaderLinkComponent } from '@kbn/home-plugin/public';

import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';

import { useLink, useStartServices } from '../../hooks';

const TutorialDirectoryHeaderLink: TutorialDirectoryHeaderLinkComponent = memo(() => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const hasIntegrationsPermissions = application.capabilities.navLinks.integrations;
  const [noticeState] = useState({
    settingsDataLoaded: false,
  });

  return hasIntegrationsPermissions && noticeState.settingsDataLoaded ? (
    <RedirectAppLinks application={application}>
      <EuiButtonEmpty size="s" iconType="link" flush="right" href={getHref('integrations')}>
        <FormattedMessage
          id="xpack.fleet.homeIntegration.tutorialDirectory.fleetAppButtonText"
          defaultMessage="Try Integrations"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  ) : null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialDirectoryHeaderLink;
