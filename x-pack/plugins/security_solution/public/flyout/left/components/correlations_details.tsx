/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';

import { useCorrelations } from '../../shared/hooks/use_correlations';
import { useLeftPanelContext } from '../context';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { AlertsTable } from './correlations_details_alerts_table';
import { ERROR_MESSAGE, ERROR_TITLE } from '../../shared/translations';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_ERROR_TEST_ID,
} from './test_ids';
import { CorrelationsCasesTable } from './correlations_cases_table';
import {
  ANCESTRY_ALERTS_HEADING,
  RELATED_CASES_HEADING,
  SESSION_ALERTS_HEADING,
  SOURCE_ALERTS_HEADING,
} from './translations';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId, scopeId } = useLeftPanelContext();

  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, _searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error: correlationsError,
    ancestryAlertsIds,
    alertsBySessionIds,
    sameSourceAlertsIds,
    cases,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  const topLevelLoading = isEventDataLoading || isCorrelationsLoading;

  if (topLevelLoading) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (correlationsError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE('Correlation Details')}</h2>}
        body={<p>{ERROR_MESSAGE('Correlation Details view')}</p>}
        data-test-subj={CORRELATIONS_DETAILS_ERROR_TEST_ID}
      />
    );
  }

  return (
    <>
      <ExpandablePanel
        header={{
          title: ANCESTRY_ALERTS_HEADING(ancestryAlertsIds.length),
          iconType: 'warning',
        }}
        expand={{ expandable: true }}
        data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}
      >
        <AlertsTable
          alertIds={ancestryAlertsIds}
          data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_TABLE_TEST_ID}
        />
      </ExpandablePanel>

      <EuiSpacer />

      <ExpandablePanel
        header={{
          title: SOURCE_ALERTS_HEADING(sameSourceAlertsIds.length),
          iconType: 'warning',
        }}
        expand={{ expandable: true }}
        data-test-subj={CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID}
      >
        <AlertsTable
          alertIds={sameSourceAlertsIds}
          data-test-subj={CORRELATIONS_DETAILS_BY_SOURCE_TABLE_TEST_ID}
        />
      </ExpandablePanel>

      <EuiSpacer />

      <ExpandablePanel
        header={{
          title: SESSION_ALERTS_HEADING(alertsBySessionIds.length),
          iconType: 'warning',
        }}
        expand={{ expandable: true }}
        data-test-subj={CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID}
      >
        <AlertsTable
          alertIds={alertsBySessionIds}
          data-test-subj={CORRELATIONS_DETAILS_BY_SESSION_TABLE_TEST_ID}
        />
      </ExpandablePanel>

      <EuiSpacer />

      <ExpandablePanel
        header={{
          title: RELATED_CASES_HEADING(cases.length),
          iconType: 'warning',
        }}
        expand={{ expandable: true }}
        data-test-subj={CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID}
      >
        <CorrelationsCasesTable cases={cases} />
      </ExpandablePanel>
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
