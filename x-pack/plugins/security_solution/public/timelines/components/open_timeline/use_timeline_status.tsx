/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiFilterButton } from '@elastic/eui';

import type {
  TemplateTimelineType,
  TimelineStatus,
  TimelineType,
} from '../../../../common/api/timeline';
import {
  TemplateTimelineTypeEnum,
  TimelineStatusEnum,
  TimelineTypeEnum,
} from '../../../../common/api/timeline';

import * as i18n from './translations';
import type { TemplateTimelineFilter } from './types';
import { installPrepackedTimelines } from '../../containers/api';

export const useTimelineStatus = ({
  timelineType,
  elasticTemplateTimelineCount,
  customTemplateTimelineCount,
}: {
  timelineType: TimelineType | null;
  elasticTemplateTimelineCount?: number | null;
  customTemplateTimelineCount?: number | null;
}): {
  timelineStatus: TimelineStatus | null;
  templateTimelineType: TemplateTimelineType | null;
  templateTimelineFilter: JSX.Element[] | null;
  installPrepackagedTimelines: () => void;
} => {
  const [selectedTab, setSelectedTab] = useState<TemplateTimelineType | null>(null);
  const isTemplateFilterEnabled = useMemo(
    () => timelineType === TimelineTypeEnum.template,
    [timelineType]
  );

  const templateTimelineType = useMemo(
    () => (!isTemplateFilterEnabled ? null : selectedTab),
    [selectedTab, isTemplateFilterEnabled]
  );

  const timelineStatus = useMemo(
    () =>
      templateTimelineType == null
        ? null
        : templateTimelineType === TemplateTimelineTypeEnum.elastic
        ? TimelineStatusEnum.immutable
        : TimelineStatusEnum.active,
    [templateTimelineType]
  );

  const filters = useMemo(
    () => [
      {
        id: TemplateTimelineTypeEnum.elastic,
        name: i18n.FILTER_ELASTIC_TIMELINES,
        disabled: !isTemplateFilterEnabled,
        withNext: true,
        count: elasticTemplateTimelineCount ?? undefined,
      },
      {
        id: TemplateTimelineTypeEnum.custom,
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
            data-test-subj={tab.name}
          >
            {tab.name}
          </EuiFilterButton>
        ))
      : null;
  }, [templateTimelineType, filters, isTemplateFilterEnabled, onFilterClicked]);

  const installPrepackagedTimelines = useCallback(async () => {
    if (templateTimelineType !== TemplateTimelineTypeEnum.custom) {
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
