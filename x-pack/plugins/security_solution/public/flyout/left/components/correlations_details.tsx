/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';

import { useLeftPanelContext } from '../context';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { dataAsNestedObject, dataFormattedForFieldBrowser, eventId, getFieldsData, scopeId } =
    useLeftPanelContext();

  const {
    show: showAlertsByAncestry,
    documentId,
    indices,
  } = useShowRelatedAlertsByAncestry({
    getFieldsData,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });
  const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
    getFieldsData,
  });
  const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ getFieldsData });
  const showCases = useShowRelatedCases();

  return (
    <>
      {showAlertsByAncestry && documentId && indices && (
        <RelatedAlertsByAncestry documentId={documentId} indices={indices} scopeId={scopeId} />
      )}

      <EuiSpacer />

      {showSameSourceAlerts && originalEventId && (
        <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
      )}

      <EuiSpacer />

      {showAlertsBySession && entityId && (
        <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
      )}

      <EuiSpacer />

      {showCases && <RelatedCases eventId={eventId} />}
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
