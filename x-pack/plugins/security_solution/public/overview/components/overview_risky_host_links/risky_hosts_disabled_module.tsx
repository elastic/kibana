/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import * as i18n from './translations';
import { DisabledLinkPanel } from '../link_panel/disabled_link_panel';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';
import { DANGER_BUTTON } from './translations';
import { devToolConsoleUrl } from '../../../../common/constants';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { OpenInDevConsoleButton } from '../../../common/components/open_in_dev_console';
import { useUserData, useUserInfo } from '../../../detections/components/user_info';
import { useChcekSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_check_signal_index';

export const RISKY_HOSTS_DOC_LINK =
  'https://www.github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md';

export const RiskyHostsDisabledModuleComponent = () => {
  const hostRiskScoreConsoleId = '61c3927a-e933-4404-b986-188680950a95';
  const loadFromUrl = useMemo(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    return `${protocol}//${hostname}:${port}${devToolConsoleUrl(hostRiskScoreConsoleId)}`;
  }, []);
  const { signalIndexExists } = useChcekSignalIndex();
  return (
    <DisabledLinkPanel
      bodyCopy={i18n.DANGER_BODY}
      learnMore={i18n.LEARN_MORE}
      dataTestSubjPrefix="risky-hosts"
      docLink={RISKY_HOSTS_DOC_LINK}
      listItems={[]}
      signalIndexExists={signalIndexExists}
      titleCopy={i18n.DANGER_TITLE}
      LinkPanelViewComponent={RiskyHostsPanelView}
      moreButtons={
        <OpenInDevConsoleButton
          loadFromUrl={loadFromUrl}
          enableButton={signalIndexExists}
          title={DANGER_BUTTON}
        />
      }
    />
  );
};

export const RiskyHostsDisabledModule = React.memo(RiskyHostsDisabledModuleComponent);
RiskyHostsEnabledModule.displayName = 'RiskyHostsDisabledModule';
