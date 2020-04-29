/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer, EuiFilterButton } from '@elastic/eui';

import {
  TimelineTypeLiteralWithNull,
  TimelineTypeLiteral,
  TimelineType,
} from '../../../common/types/timeline';

import { getTimelinesUrl, getTimelineTabsUrl } from '../link_to';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../pages/home/home_navigations';

import * as i18n from './translations';
import { TimelineTabsStyle } from './types';

export const useTimelineTypes = (): {
  timelineTypes: TimelineTypeLiteralWithNull;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element;
} => {
  const urlSearch = useGetUrlSearch(navTabs.timelines);
  const { tabName } = useParams<{ pageName: string; tabName: string }>();
  const [timelineTypes, setTimelineTypes] = useState<TimelineTypeLiteralWithNull>(tabName || null);

  const getTabs: Array<{
    id: TimelineTypeLiteral;
    name: string;
    disabled: boolean;
    href: string;
  }> = (timelineTabsStyle: TimelineTabsStyle) => [
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
  ];

  const onFilterClicked = useCallback(
    (timelineTabsStyle, tabId) => {
      if (timelineTabsStyle === TimelineTabsStyle.filter && tabId === timelineTypes) {
        setTimelineTypes(null);
      } else {
        setTimelineTypes(tabId);
      }
    },
    [timelineTypes, setTimelineTypes]
  );

  const timelineTabs = useMemo(() => {
    return (
      <>
        <EuiTabs>
          {getTabs(TimelineTabsStyle.tab).map(tab => (
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
  }, [getTabs, tabName]);

  const timelineFilters = useMemo(() => {
    return (
      <>
        {getTabs(TimelineTabsStyle.tab).map(tab => (
          <EuiFilterButton
            hasActiveFilters={tab.id === timelineTypes}
            key={`timeline-${TimelineTabsStyle.filter}-${tab.id}`}
            onClick={onFilterClicked.bind(null, TimelineTabsStyle.filter, tab.id)}
          >
            {tab.name}
          </EuiFilterButton>
        ))}
      </>
    );
  }, [getTabs, timelineTypes]);

  return {
    timelineTypes,
    timelineTabs,
    timelineFilters,
  };
};
