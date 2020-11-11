/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { TutorialDirectoryHeaderLinkComponent } from 'src/plugins/home/public';
import { useLink, useCapabilities } from '../../hooks';

const tutorialDirectoryNoticeState$ = new BehaviorSubject({
  settingsDataLoaded: false,
  hasSeenNotice: false,
});

const TutorialDirectoryHeaderLink: TutorialDirectoryHeaderLinkComponent = memo(() => {
  const { getHref } = useLink();
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
    <EuiButtonEmpty size="s" iconType="link" flush="right" href={getHref('overview')}>
      <FormattedMessage
        id="xpack.fleet.homeIntegration.tutorialDirectory.fleetAppButtonText"
        defaultMessage="Try Fleet Beta"
      />
    </EuiButtonEmpty>
  ) : null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialDirectoryHeaderLink;
