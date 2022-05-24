/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import type { EntityType } from '@kbn/timelines-plugin/common';
import { timelineActions } from '../../../timelines/store/timeline';
import { TimelineIdLiteral } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { alertsDefaultModel } from './default_headers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import * as i18n from './translations';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import { useKibana } from '../../lib/kibana';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';

export interface OwnProps {
  end: string;
  id: string;
  start: string;
}

const defaultAlertsFilters: Filter[] = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'event.kind',
      params: {
        query: 'alert',
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'event.kind': 'alert',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  },
];

interface Props {
  timelineId: TimelineIdLiteral;
  endDate: string;
  entityType?: EntityType;
  startDate: string;
  pageFilters?: Filter[];
}

const AlertsTableComponent: React.FC<Props> = ({
  timelineId,
  endDate,
  entityType = 'alerts',
  startDate,
  pageFilters = [],
}) => {
  const dispatch = useDispatch();
  const alertsFilter = useMemo(() => [...defaultAlertsFilters, ...pageFilters], [pageFilters]);
  const { filterManager } = useKibana().services.data.query;
  const ACTION_BUTTON_COUNT = 5;

  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

  useEffect(() => {
    dispatch(
      timelineActions.initializeTGridSettings({
        id: timelineId,
        documentType: i18n.ALERTS_DOCUMENT_TYPE,
        filterManager,
        defaultColumns: alertsDefaultModel.columns.map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        excludedRowRendererIds: alertsDefaultModel.excludedRowRendererIds,
        footerText: i18n.TOTAL_COUNT_OF_ALERTS,
        title: i18n.ALERTS_TABLE_TITLE,
        // TODO: avoid passing this through the store
      })
    );
  }, [dispatch, filterManager, tGridEnabled, timelineId]);

  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  return (
    <StatefulEventsViewer
      pageFilters={alertsFilter}
      defaultModel={alertsDefaultModel}
      defaultCellActions={defaultCellActions}
      end={endDate}
      entityType={entityType}
      id={timelineId}
      leadingControlColumns={leadingControlColumns}
      renderCellValue={DefaultCellRenderer}
      rowRenderers={defaultRowRenderers}
      scopeId={SourcererScopeName.default}
      start={startDate}
    />
  );
};

export const AlertsTable = React.memo(AlertsTableComponent);
