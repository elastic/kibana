/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EMPTY_LIST_ITEMS } from '../../containers/overview_cti_links/helpers';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { DisabledLinkPanel } from '../link_panel/disabled_link_panel';
import { ThreatIntelPanelView } from './threat_intel_panel_view';

export const CtiDisabledModuleComponent = () => {
  const threatIntelDocLink = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;

  return (
    <DisabledLinkPanel
      bodyCopy={i18n.DANGER_BODY}
      buttonCopy={i18n.DANGER_BUTTON}
      dataTestSubjPrefix="cti"
      docLink={threatIntelDocLink}
      listItems={EMPTY_LIST_ITEMS}
      titleCopy={i18n.DANGER_TITLE}
      LinkPanelViewComponent={ThreatIntelPanelView}
    />
  );
};

export const CtiDisabledModule = React.memo(CtiDisabledModuleComponent);
CtiDisabledModule.displayName = 'CtiDisabledModule';
