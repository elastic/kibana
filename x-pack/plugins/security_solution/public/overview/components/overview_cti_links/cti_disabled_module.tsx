/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as i18n from './translations';
import { DisabledLinkPanel } from '../link_panel/disabled_link_panel';
import { ThreatIntelPanelView } from './threat_intel_panel_view';
import { useIntegrationsPageLink } from './use_integrations_page_link';

export const CtiDisabledModuleComponent = () => {
  const integrationsLink = useIntegrationsPageLink();

  return (
    <DisabledLinkPanel
      bodyCopy={i18n.DANGER_BODY}
      buttonCopy={i18n.DANGER_BUTTON}
      dataTestSubjPrefix="cti"
      docLink={integrationsLink}
      listItems={[]}
      titleCopy={i18n.DANGER_TITLE}
      LinkPanelViewComponent={ThreatIntelPanelView}
    />
  );
};

export const CtiDisabledModule = React.memo(CtiDisabledModuleComponent);
CtiDisabledModule.displayName = 'CtiDisabledModule';
