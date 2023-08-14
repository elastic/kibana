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
  const { dataFormattedForFieldBrowser, dataAsNestedObject, eventId, scopeId } =
    useLeftPanelContext();

  const showAlertsByAncestry = useShowRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
  });
  const showAlertsBySession = useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser });
  const showSameSourceAlerts = useShowRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
  });
  const showCases = useShowRelatedCases();

  return (
    <>
      {showAlertsByAncestry && (
        <RelatedAlertsByAncestry
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          scopeId={scopeId}
        />
      )}

      <EuiSpacer />

      {showSameSourceAlerts && (
        <RelatedAlertsBySameSourceEvent
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          scopeId={scopeId}
        />
      )}

      <EuiSpacer />

      {showAlertsBySession && (
        <RelatedAlertsBySession
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          scopeId={scopeId}
        />
      )}

      <EuiSpacer />

      {showCases && <RelatedCases eventId={eventId} />}
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
