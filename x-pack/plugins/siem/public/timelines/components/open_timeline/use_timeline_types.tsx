/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer, EuiFilterButton } from '@elastic/eui';

import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../common/types/timeline';

import { getTimelineTabsUrl } from '../../../common/components/link_to';
import { navTabs } from '../../../app/home/home_navigations';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import * as i18n from './translations';
import { TimelineTabsStyle, TimelineTab } from './types';

export const useTimelineTypes = (): {
  timelineType: TimelineTypeLiteralWithNull;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element;
} => {
  const urlSearch = useGetUrlSearch(navTabs.timelines);
  const { tabName } = useParams<{ pageName: string; tabName: string }>();
  const [timelineType, setTimelineTypes] = useState<TimelineTypeLiteralWithNull>(
    tabName === TimelineType.default || tabName === TimelineType.template ? tabName : null
  );

  const getFilterOrTabs: (timelineTabsStyle: TimelineTabsStyle) => TimelineTab[] = useCallback(
    (timelineTabsStyle: TimelineTabsStyle) => [
      {
        id: TimelineType.default,
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TIMELINES)
            : i18n.TAB_TIMELINES,
        href: getTimelineTabsUrl(TimelineType.default, urlSearch),
        disabled: false,
      },
      {
        id: TimelineType.template,
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TEMPLATES)
            : i18n.TAB_TEMPLATES,
        href: getTimelineTabsUrl(TimelineType.template, urlSearch),
        disabled: false,
      },
    ],
    [urlSearch]
  );

  const onFilterClicked = useCallback(
    (timelineTabsStyle, tabId) => {
      if (timelineTabsStyle === TimelineTabsStyle.filter && tabId === timelineType) {
        setTimelineTypes(null);
      } else {
        setTimelineTypes(tabId);
      }
    },
    [timelineType, setTimelineTypes]
  );

  const timelineTabs = useMemo(() => {
    return (
      <>
        <EuiTabs>
          {getFilterOrTabs(TimelineTabsStyle.tab).map((tab: TimelineTab) => (
            <EuiTab
              isSelected={tab.id === tabName}
              disabled={tab.disabled}
              key={`timeline-${TimelineTabsStyle.tab}-${tab.id}`}
              href={tab.href}
              onClick={onFilterClicked.bind(null, TimelineTabsStyle.tab, tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
      </>
    );
  }, [getFilterOrTabs, onFilterClicked, tabName]);

  const timelineFilters = useMemo(() => {
    return (
      <>
        {getFilterOrTabs(TimelineTabsStyle.tab).map((tab: TimelineTab) => (
          <EuiFilterButton
            hasActiveFilters={tab.id === timelineType}
            key={`timeline-${TimelineTabsStyle.filter}-${tab.id}`}
            onClick={onFilterClicked.bind(null, TimelineTabsStyle.filter, tab.id)}
          >
            {tab.name}
          </EuiFilterButton>
        ))}
      </>
    );
  }, [getFilterOrTabs, onFilterClicked, timelineType]);

  return {
    timelineType,
    timelineTabs,
    timelineFilters,
  };
};
