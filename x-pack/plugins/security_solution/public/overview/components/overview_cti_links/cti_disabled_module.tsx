/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { ThreatIntelPanelView } from './threat_intel_panel_view';
import { EMPTY_LIST_ITEMS } from '../../containers/overview_cti_links/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { CtiInnerPanel } from './cti_inner_panel';
import * as i18n from './translations';

export const CtiDisabledModuleComponent = () => {
  const threatIntelDocLink = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;

  const danger = useMemo(
    () => (
      <CtiInnerPanel
        color={'warning'}
        title={i18n.DANGER_TITLE}
        body={i18n.DANGER_BODY}
        button={
          <EuiButton
            href={threatIntelDocLink}
            color={'warning'}
            target="_blank"
            data-test-subj="cti-enable-module-button"
          >
            {i18n.DANGER_BUTTON}
          </EuiButton>
        }
        dataTestSubj="cti-inner-panel-danger"
      />
    ),
    [threatIntelDocLink]
  );

  return (
    <ThreatIntelPanelView
      totalEventCount={0}
      splitPanel={danger}
      listItems={EMPTY_LIST_ITEMS}
      isInspectEnabled={false}
    />
  );
};

CtiDisabledModuleComponent.displayName = 'CtiDisabledModule';

export const CtiDisabledModule = React.memo(CtiDisabledModuleComponent);
