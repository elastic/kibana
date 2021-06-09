/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { TutorialDirectoryHeaderLinkComponent } from 'src/plugins/home/public';

import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public';
import { useLink, useCapabilities, useStartServices } from '../../hooks';

import { tutorialDirectoryNoticeState$ } from './tutorial_directory_notice';

const TutorialDirectoryHeaderLink: TutorialDirectoryHeaderLinkComponent = memo(() => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const { show: hasIngestManager } = useCapabilities();
  const [noticeState, setNoticeState] = useState({
    settingsDataLoaded: false,
    hasSeenNotice: false,
  });

  useEffect(() => {
    const subscription = tutorialDirectoryNoticeState$.subscribe((value) => setNoticeState(value));
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return hasIngestManager && noticeState.settingsDataLoaded && noticeState.hasSeenNotice ? (
    <RedirectAppLinks application={application}>
      <EuiButtonEmpty size="s" iconType="link" flush="right" href={getHref('overview')}>
        <FormattedMessage
          id="xpack.fleet.homeIntegration.tutorialDirectory.fleetAppButtonText"
          defaultMessage="Try Fleet Beta"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  ) : null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialDirectoryHeaderLink;
