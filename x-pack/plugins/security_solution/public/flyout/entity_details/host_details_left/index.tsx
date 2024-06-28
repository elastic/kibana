/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { getRiskInputTab } from '../../../entity_analytics/components/entity_details_flyout';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';
import {
  EntityDetailsLeftPanelTab,
  LeftPanelHeader,
} from '../shared/components/left_panel/left_panel_header';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';

export interface HostDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  name: string;
  scopeId: string;
}
export interface HostDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'host_details';
  params: HostDetailsPanelProps;
}
export const HostDetailsPanelKey: HostDetailsExpandableFlyoutProps['key'] = 'host_details';

export const HostDetailsPanel = ({ name, isRiskScoreExist, scopeId }: HostDetailsPanelProps) => {
  // Temporary implementation while Host details left panel don't have Asset tabs
  const [tabs, selectedTabId, setSelectedTabId] = useMemo(() => {
    const isRiskScoreTabAvailable = isRiskScoreExist && name;
    return [
      isRiskScoreTabAvailable
        ? [getRiskInputTab({ entityName: name, entityType: RiskScoreEntity.host, scopeId })]
        : [],
      EntityDetailsLeftPanelTab.RISK_INPUTS,
      () => {},
    ];
  }, [name, isRiskScoreExist, scopeId]);

  return (
    <>
      <LeftPanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabs}
      />
      <LeftPanelContent selectedTabId={selectedTabId} tabs={tabs} />
    </>
  );
};

HostDetailsPanel.displayName = 'HostDetailsPanel';
