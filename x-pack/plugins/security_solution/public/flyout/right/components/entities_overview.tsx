/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import {
  ENTITIES_HEADER_TEST_ID,
  ENTITIES_CONTENT_TEST_ID,
  ENTITIES_HOST_CONTENT_TEST_ID,
  ENTITIES_USER_CONTENT_TEST_ID,
  ENTITIES_VIEW_ALL_BUTTON_TEST_ID,
} from './test_ids';
import { ENTITIES_TITLE, ENTITIES_TEXT, VIEW_ALL } from './translations';
import { EntityPanel } from './entity_panel';
import { getField } from '../../shared/utils';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';

const USER_ICON = 'user';
const HOST_ICON = 'storage';

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
      path: {
        tab: LeftPanelInsightsTab,
        subTab: ENTITIES_TAB_ID,
      },
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
      <EuiTitle size="xxs" data-test-subj={ENTITIES_HEADER_TEST_ID}>
        <h5>{ENTITIES_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj={ENTITIES_CONTENT_TEST_ID} direction="column" gutterSize="s">
        {userName && (
          <EuiFlexItem>
            <EntityPanel
              title={userName}
              iconType={USER_ICON}
              data-test-subj={ENTITIES_USER_CONTENT_TEST_ID}
            >
              <UserEntityOverview userName={userName} />
            </EntityPanel>
          </EuiFlexItem>
        )}
        {hostName && (
          <EuiFlexItem>
            <EntityPanel
              title={hostName}
              iconType={HOST_ICON}
              data-test-subj={ENTITIES_HOST_CONTENT_TEST_ID}
            >
              <HostEntityOverview hostName={hostName} />
            </EntityPanel>
          </EuiFlexItem>
        )}
        <EuiButtonEmpty
          onClick={goToEntitiesTab}
          iconType="arrowStart"
          iconSide="left"
          size="s"
          data-test-subj={ENTITIES_VIEW_ALL_BUTTON_TEST_ID}
        >
          {VIEW_ALL(ENTITIES_TEXT)}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </>
  );
};

EntitiesOverview.displayName = 'EntitiesOverview';
