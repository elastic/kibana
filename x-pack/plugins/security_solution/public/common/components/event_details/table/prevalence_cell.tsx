/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import type { AlertSummaryRow } from '../helpers';
import { getEmptyTagValue } from '../../empty_value';
import { InvestigateInTimelineButton } from './investigate_in_timeline_button';
import {
  useActionCellDataProvider,
  ActionCellValuesAndDataProvider,
  getDataProvider,
} from './use_action_cell_data_provider';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { useAlertPrevalenceFromProcessTree } from '../../../containers/alerts/use_alert_prevalence_from_process_tree';

/**
 * Renders a Prevalence cell based on a the process tree
 */
const PrevalenceFromProcessTree = React.memo<AlertSummaryRow['description']>(
  ({ data, eventId, fieldFromBrowserField, linkValue, timelineId, values }) => {
    const { loading, alertIds } = useAlertPrevalenceFromProcessTree({
      parentEntityId: values,
      timelineId,
      signalIndexName: null,
    });

    const fakeData = useMemo<Partial<ActionCellValuesAndDataProvider>>(() => {
      if (alertIds && alertIds.length) {
        return alertIds.reduce<ActionCellValuesAndDataProvider>(
          (result, alertId, index) => {
            const id = `${timelineId}-${eventId}-event.id-${index}-${alertId}`;
            result.values.push(alertId);
            result.dataProviders.push(getDataProvider('event.id', id, alertId));
            return result;
          },
          {
            values: [],
            dataProviders: [],
          }
        );
      }
      return {};
    }, [alertIds, eventId, timelineId]);

    return (
      <PrevalenceCell
        loading={loading}
        count={fakeData.values?.length}
        dataProviders={fakeData.dataProviders}
      />
    );
  }
);

PrevalenceFromProcessTree.displayName = 'PrevalenceFromProcessTree';

/**
 * Renders a Prevalence cell based on a regular alert prevalence query
 */
const PrevalenceCellFromQuery = React.memo<AlertSummaryRow['description']>(
  ({ data, eventId, fieldFromBrowserField, linkValue, timelineId, values }) => {
    const { loading, count } = useAlertPrevalence({
      field: data.field,
      timelineId,
      value: values,
      signalIndexName: null,
    });

    const cellDataProvider = useActionCellDataProvider({
      contextId: timelineId,
      eventId,
      field: data.field,
      fieldFormat: data.format,
      fieldFromBrowserField,
      fieldType: data.type,
      isObjectArray: data.isObjectArray,
      linkValue,
      values,
    });

    return (
      <PrevalenceCell
        loading={loading}
        count={count}
        dataProviders={cellDataProvider?.dataProviders}
      />
    );
  }
);

PrevalenceCellFromQuery.displayName = 'PrevalenceCellFromQuery';

const PrevalenceCell = React.memo<
  { loading: boolean; count?: number } & Partial<
    Pick<ActionCellValuesAndDataProvider, 'dataProviders'>
  >
>(({ count, dataProviders, loading }) => {
  if (loading) {
    return <EuiLoadingSpinner />;
  } else if (typeof count === 'number' && dataProviders && dataProviders.length) {
    return (
      <InvestigateInTimelineButton dataProviders={dataProviders}>
        <span data-test-subj="alert-prevalence">{count}</span>
      </InvestigateInTimelineButton>
    );
  } else {
    return getEmptyTagValue();
  }
});

PrevalenceCell.displayName = 'PrevalenceCell';

/**
 * Renders the correct PrevalenceCell based on the given field.
 */
export const PrevalenceCellRenderer = (data: AlertSummaryRow['description']) => {
  if (data.data.field === 'process.entity_id') {
    return <PrevalenceFromProcessTree {...data} />;
  }

  return <PrevalenceCellFromQuery {...data} />;
};
