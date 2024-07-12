/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EntityType } from '@kbn/timelines-plugin/common';
import { dataTableSelectors } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../../../common/lib/kibana';
import { isInTableScope, isTimelineScope } from '../../../../helpers';
import { timelineSelectors } from '../../../store';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import type { SourcererScopeName } from '../../../../sourcerer/store/model';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../store/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DetailsPanel as DetailsPanelComponent } from '..';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';

export interface UseDetailPanelConfig {
  entityType?: EntityType;
  isFlyoutView?: boolean;
  sourcererScope: SourcererScopeName;
  scopeId: string;
  tabType?: TimelineTabs;
}
export interface UseDetailPanelReturn {
  openEventDetailsPanel: (eventId?: string, onClose?: () => void) => void;
  DetailsPanel: JSX.Element | null;
  shouldShowDetailsPanel: boolean;
}

export const useDetailPanel = ({
  entityType,
  isFlyoutView,
  sourcererScope,
  scopeId,
  tabType = TimelineTabs.query,
}: UseDetailPanelConfig): UseDetailPanelReturn => {
  const { telemetry } = useKibana().services;
  const { browserFields, selectedPatterns, runtimeMappings } = useSourcererDataView(sourcererScope);

  const { openFlyout } = useExpandableFlyoutApi();

  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);
  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const expandedDetail = useDeepEqualSelector(
    (state) => ((getScope && getScope(state, scopeId)) ?? timelineDefaults)?.expandedDetail
  );

  const shouldShowDetailsPanel = useMemo(() => {
    if (
      tabType &&
      expandedDetail &&
      expandedDetail[tabType] &&
      !!expandedDetail[tabType]?.panelView
    ) {
      return true;
    }
    return false;
  }, [expandedDetail, tabType]);

  const openEventDetailsPanel = useCallback(
    (eventId?: string, onClose?: () => void) => {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName: eventDetailsIndex,
            scopeId,
          },
        },
      });
      telemetry.reportDetailsFlyoutOpened({
        location: scopeId,
        panel: 'right',
      });
    },
    [openFlyout, eventDetailsIndex, scopeId, telemetry]
  );

  const DetailsPanel = useMemo(
    () =>
      shouldShowDetailsPanel ? (
        <DetailsPanelComponent
          browserFields={browserFields}
          entityType={entityType}
          handleOnPanelClosed={() => {}}
          isFlyoutView={isFlyoutView}
          runtimeMappings={runtimeMappings}
          tabType={tabType}
          scopeId={scopeId}
        />
      ) : null,
    [
      browserFields,
      entityType,
      isFlyoutView,
      runtimeMappings,
      shouldShowDetailsPanel,
      tabType,
      scopeId,
    ]
  );

  return {
    openEventDetailsPanel,
    shouldShowDetailsPanel,
    DetailsPanel,
  };
};
