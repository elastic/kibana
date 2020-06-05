/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { EuiFilterButton } from '@elastic/eui';

import {
  TimelineStatus,
  TimelineType,
  TimelineTypeLiteralWithNull,
  TemplateTimelineType,
  TemplateTimelineTypeLiteralWithNull,
  TimelineStatusLiteral,
} from '../../../../common/types/timeline';

import * as i18n from './translations';
import { TimelineTabsStyle, TemplateTimelineFilter } from './types';

export const usePrepackageTimelineFilter = ({
  timelineType,
  elasticTemplateTimelineCount,
  customizedTemplateTimelineCount,
}: {
  timelineType: TimelineTypeLiteralWithNull;
  elasticTemplateTimelineCount?: number | null;
  customizedTemplateTimelineCount?: number | null;
}): {
  timelineStatus: TimelineStatusLiteral;
  templateTimelineFilter: JSX.Element[] | null;
} => {
  const showTemplateTimelineFilter = timelineType === TimelineType.template;

  const [templateTimelineType, setTemplateTimelineType] = useState<
    TemplateTimelineTypeLiteralWithNull
  >(showTemplateTimelineFilter ? TemplateTimelineType.elastic : null);

  const filters = [
    {
      id: TemplateTimelineType.elastic,
      name: i18n.FILTER_ELASTIC_TIMELINES,
      disabled: false,
      withNext: true,
      count: elasticTemplateTimelineCount ?? undefined,
    },
    {
      id: TemplateTimelineType.customized,
      name: i18n.FILTER_CUSTOMISED_TIMELINES,
      disabled: false,
      withNext: false,
      count: customizedTemplateTimelineCount ?? undefined,
    },
  ];

  const onFilterClicked = useCallback(
    (timelineStatus, tabId) => {
      if (timelineStatus !== TimelineStatus.immutiable && tabId !== TemplateTimelineType.elastic) {
        setTemplateTimelineType(TemplateTimelineType.customized);
      } else {
        setTemplateTimelineType(tabId);
      }
    },
    [setTemplateTimelineType]
  );

  const templateTimelineFilter = useMemo(() => {
    return showTemplateTimelineFilter
      ? filters.map((tab: TemplateTimelineFilter) => (
          <EuiFilterButton
            hasActiveFilters={tab.id === templateTimelineType}
            key={`template-timeline-filter-${tab.id}`}
            numFilters={tab.count}
            onClick={onFilterClicked.bind(null, TimelineTabsStyle.filter, tab.id)}
          >
            {tab.name}
          </EuiFilterButton>
        ))
      : null;
  }, [templateTimelineType, showTemplateTimelineFilter]);

  return {
    timelineStatus:
      templateTimelineType === TemplateTimelineType.elastic
        ? TimelineStatus.immutiable
        : TimelineStatus.active,
    templateTimelineFilter,
  };
};
