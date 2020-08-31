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
  TimelineStatusLiteralWithNull,
} from '../../../../common/types/timeline';

import * as i18n from './translations';
import { TemplateTimelineFilter } from './types';
import { installPrepackedTimelines } from '../../containers/api';

export const useTimelineStatus = ({
  timelineType,
  elasticTemplateTimelineCount,
  customTemplateTimelineCount,
}: {
  timelineType: TimelineTypeLiteralWithNull;
  elasticTemplateTimelineCount?: number | null;
  customTemplateTimelineCount?: number | null;
}): {
  timelineStatus: TimelineStatusLiteralWithNull;
  templateTimelineType: TemplateTimelineTypeLiteralWithNull;
  templateTimelineFilter: JSX.Element[] | null;
  installPrepackagedTimelines: () => void;
} => {
  const [selectedTab, setSelectedTab] = useState<TemplateTimelineTypeLiteralWithNull>(null);
  const isTemplateFilterEnabled = useMemo(() => timelineType === TimelineType.template, [
    timelineType,
  ]);

  const templateTimelineType = useMemo(() => (!isTemplateFilterEnabled ? null : selectedTab), [
    selectedTab,
    isTemplateFilterEnabled,
  ]);

  const timelineStatus = useMemo(
    () =>
      templateTimelineType == null
        ? null
        : templateTimelineType === TemplateTimelineType.elastic
        ? TimelineStatus.immutable
        : TimelineStatus.active,
    [templateTimelineType]
  );

  const filters = useMemo(
    () => [
      {
        id: TemplateTimelineType.elastic,
        name: i18n.FILTER_ELASTIC_TIMELINES,
        disabled: !isTemplateFilterEnabled,
        withNext: true,
        count: elasticTemplateTimelineCount ?? undefined,
      },
      {
        id: TemplateTimelineType.custom,
        name: i18n.FILTER_CUSTOM_TIMELINES,
        disabled: !isTemplateFilterEnabled,
        withNext: false,
        count: customTemplateTimelineCount ?? undefined,
      },
    ],
    [customTemplateTimelineCount, elasticTemplateTimelineCount, isTemplateFilterEnabled]
  );

  const onFilterClicked = useCallback(
    (tabId) => {
      if (selectedTab === tabId) {
        setSelectedTab(null);
      } else {
        setSelectedTab(tabId);
      }
    },
    [setSelectedTab, selectedTab]
  );

  const templateTimelineFilter = useMemo(() => {
    return isTemplateFilterEnabled
      ? filters.map((tab: TemplateTimelineFilter) => (
          <EuiFilterButton
            hasActiveFilters={tab.id === templateTimelineType}
            key={`template-timeline-filter-${tab.id}`}
            numFilters={tab.count}
            onClick={onFilterClicked.bind(null, tab.id)}
            withNext={tab.withNext}
            isDisabled={tab.disabled}
          >
            {tab.name}
          </EuiFilterButton>
        ))
      : null;
  }, [templateTimelineType, filters, isTemplateFilterEnabled, onFilterClicked]);

  const installPrepackagedTimelines = useCallback(async () => {
    if (templateTimelineType !== TemplateTimelineType.custom) {
      await installPrepackedTimelines();
    }
  }, [templateTimelineType]);

  return {
    timelineStatus,
    templateTimelineType,
    templateTimelineFilter,
    installPrepackagedTimelines,
  };
};
