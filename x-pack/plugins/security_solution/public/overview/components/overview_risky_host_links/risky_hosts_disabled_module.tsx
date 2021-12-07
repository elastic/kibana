/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import * as i18n from './translations';
import { DisabledLinkPanel } from '../link_panel/disabled_link_panel';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';

export const RISKY_HOSTS_DOC_LINK =
  'https://www.github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md';

export const RiskyHostsDisabledModuleComponent = () => (
  <DisabledLinkPanel
    bodyCopy={i18n.DANGER_BODY}
    buttonCopy={i18n.DANGER_BUTTON}
    dataTestSubjPrefix="risky-hosts"
    docLink={RISKY_HOSTS_DOC_LINK}
    listItems={[]}
    titleCopy={i18n.DANGER_TITLE}
    LinkPanelViewComponent={RiskyHostsPanelView}
  />
);

export const RiskyHostsDisabledModule = React.memo(RiskyHostsDisabledModuleComponent);
RiskyHostsEnabledModule.displayName = 'RiskyHostsDisabledModule';
