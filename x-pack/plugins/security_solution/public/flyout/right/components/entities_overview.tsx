/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useRightPanelContext } from '../context';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { ENTITIES_TITLE } from './translations';
import { getField } from '../../shared/utils';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: React.FC = () => {
  const { eventId, getFieldsData, indexName, scopeId } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));

  const goToEntitiesTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  if (!eventId || (!userName && !hostName)) {
    return null;
  }

  return (
    <>
      <ExpandablePanel
        header={{
          title: ENTITIES_TITLE,
          callback: goToEntitiesTab,
          iconType: 'arrowStart',
        }}
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          {userName && (
            <EuiFlexItem>
              <UserEntityOverview userName={userName} />
            </EuiFlexItem>
          )}
          {hostName && (
            <EuiFlexItem>
              <HostEntityOverview hostName={hostName} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ExpandablePanel>
    </>
  );
};

EntitiesOverview.displayName = 'EntitiesOverview';
