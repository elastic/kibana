/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer, EuiFilterButton } from '@elastic/eui';
import * as i18n from './translations';
import { TimelineTabsStyle } from './types';
import { getTimelinesUrl, getTemplateTimelinesUrl } from '../link_to/redirect_to_timelines';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../pages/home/home_navigations';

export const useTimelineTabs = (
  timelineTabsStyle?: TimelineTabsStyle.tab | TimelineTabsStyle.filter
): {
  timelineTypes: 'default' | 'template' | null;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element;
} => {
  const urlSearch = useGetUrlSearch(navTabs.timelines);
  const { tabName } = useParams<{ pageName: string; tabName: string }>();
  const [timelineTypes, setTimelineTypes] = useState<'default' | 'template' | null>(
    timelineTabsStyle === TimelineTabsStyle.tab ? 'default' : null
  );
  const tabs: Array<{
    id: 'default' | 'template';
    name: string;
    disabled: boolean;
    href: string;
  }> = useMemo(
    () => [
      {
        id: 'default',
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TIMELINES)
            : i18n.TAB_TIMELINES,
        href: getTimelinesUrl(urlSearch),
        disabled: false,
      },
      {
        id: 'template',
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TEMPLATES)
            : i18n.TAB_TEMPLATES,
        href: getTemplateTimelinesUrl(urlSearch),
        disabled: false,
      },
    ],
    [timelineTabsStyle]
  );

  const onFilterClicked = useCallback(
    tabId => {
      if (timelineTabsStyle === TimelineTabsStyle.filter && tabId === timelineTypes) {
        setTimelineTypes(null);
      } else {
        setTimelineTypes(tabId);
      }
    },
    [setTimelineTypes]
  );

  const timelineTabs = useMemo(() => {
    return (
      <>
        <EuiTabs>
          {tabs.map(tab => (
            <EuiTab
              isSelected={tab.id === tabName}
              disabled={tab.disabled}
              key={`timeline-tab-${tab.id}`}
              href={tab.href}
              onClick={onFilterClicked.bind(null, tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
      </>
    );
  }, [tabs, tabName]);

  const timelineFilters = useMemo(() => {
    return (
      <>
        {tabs.map(tab => (
          <EuiFilterButton
            hasActiveFilters={tab.id === timelineTypes}
            key={`timeline-filter-${tab.id}`}
            onClick={onFilterClicked.bind(null, tab.id)}
          >
            {tab.name}
          </EuiFilterButton>
        ))}
      </>
    );
  }, [tabs, timelineTypes]);

  return {
    timelineTypes,
    timelineTabs,
    timelineFilters,
  };
};
