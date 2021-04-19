/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { Filter } from '../../../../../../../src/plugins/data/public';
import { TimelineIdLiteral } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { alertsDefaultModel } from './default_headers';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import * as i18n from './translations';
import { useKibana } from '../../lib/kibana';
import { SourcererScopeName } from '../../store/sourcerer/model';

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
  startDate: string;
  pageFilters?: Filter[];
}

const AlertsTableComponent: React.FC<Props> = ({
  timelineId,
  endDate,
  startDate,
  pageFilters = [],
}) => {
  const alertsFilter = useMemo(() => [...defaultAlertsFilters, ...pageFilters], [pageFilters]);
  const { filterManager } = useKibana().services.data.query;
  const { initializeTimeline } = useManageTimeline();

  useEffect(() => {
    initializeTimeline({
      id: timelineId,
      documentType: i18n.ALERTS_DOCUMENT_TYPE,
      filterManager,
      defaultModel: alertsDefaultModel,
      footerText: i18n.TOTAL_COUNT_OF_ALERTS,
      title: i18n.ALERTS_TABLE_TITLE,
      unit: i18n.UNIT,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StatefulEventsViewer
      pageFilters={alertsFilter}
      defaultModel={alertsDefaultModel}
      end={endDate}
      id={timelineId}
      renderCellValue={DefaultCellRenderer}
      rowRenderers={defaultRowRenderers}
      scopeId={SourcererScopeName.default}
      start={startDate}
    />
  );
};

export const AlertsTable = React.memo(AlertsTableComponent);
