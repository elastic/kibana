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
import { ENABLE_VIA_DEV_TOOLS } from './translations';
import { devToolConsoleUrl } from '../../../../common/constants';
import { OpenInDevConsoleButton } from '../../../common/components/open_in_dev_console';
import { useChcekSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import type { LinkPanelListItem } from '../link_panel';

export const RISKY_HOSTS_DOC_LINK =
  'https://www.github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md';
const DETECTION_ENGINE_DOC_LINK =
  'https://www.elastic.co/guide/en/security/current/detection-engine-overview.html';
const emptyList: LinkPanelListItem[] = [];

export const RiskyHostsDisabledModuleComponent = () => {
  const hostRiskScoreConsoleId = 'enable_host_risk_score';
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
      dataTestSubjPrefix="risky-hosts"
      learnMoreUrl={RISKY_HOSTS_DOC_LINK}
      listItems={emptyList}
      titleCopy={i18n.DANGER_TITLE}
      LinkPanelViewComponent={RiskyHostsPanelView}
      moreButtons={
        <OpenInDevConsoleButton
          loadFromUrl={loadFromUrl}
          enableButton={!!signalIndexExists}
          title={ENABLE_VIA_DEV_TOOLS}
          learnMoreUrl={DETECTION_ENGINE_DOC_LINK}
        />
      }
    />
  );
};

export const RiskyHostsDisabledModule = React.memo(RiskyHostsDisabledModuleComponent);
RiskyHostsEnabledModule.displayName = 'RiskyHostsDisabledModule';
