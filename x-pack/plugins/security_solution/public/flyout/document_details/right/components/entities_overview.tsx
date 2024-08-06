/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: React.FC = () => {
  const { eventId, getFieldsData, indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));

  const goToEntitiesTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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

  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goToEntitiesTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.entities.entitiesTooltip"
                defaultMessage="Show all entities"
              />
            ),
          }
        : undefined,
    [goToEntitiesTab, isPreviewMode]
  );

  return (
    <>
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.entities.entitiesTitle"
              defaultMessage="Entities"
            />
          ),
          link,
          iconType: !isPreviewMode ? 'arrowStart' : undefined,
        }}
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
      >
        {userName || hostName ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {userName && (
              <>
                <EuiFlexItem>
                  <UserEntityOverview userName={userName} />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {hostName && (
              <EuiFlexItem>
                <HostEntityOverview hostName={hostName} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.entities.noDataDescription"
            defaultMessage="Host and user information are unavailable for this alert."
          />
        )}
      </ExpandablePanel>
    </>
  );
};

EntitiesOverview.displayName = 'EntitiesOverview';
