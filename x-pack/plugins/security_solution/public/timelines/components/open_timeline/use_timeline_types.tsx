/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer, EuiFilterButton } from '@elastic/eui';

import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { getTimelineTabsUrl, useFormatUrl } from '../../../common/components/link_to';
import * as i18n from './translations';
import { TimelineTabsStyle, TimelineTab } from './types';

export const useTimelineTypes = ({
  defaultTimelineCount,
  templateTimelineCount,
}: {
  defaultTimelineCount?: number | null;
  templateTimelineCount?: number | null;
}): {
  timelineType: TimelineTypeLiteralWithNull;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element[];
} => {
  const history = useHistory();
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.timelines);
  const { tabName } = useParams<{ pageName: string; tabName: string }>();
  const [timelineType, setTimelineTypes] = useState<TimelineTypeLiteralWithNull>(
    tabName === TimelineType.default || tabName === TimelineType.template ? tabName : null
  );

  const goToTimeline = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getTimelineTabsUrl(TimelineType.default, urlSearch));
    },
    [history, urlSearch]
  );

  const goToTemplateTimeline = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getTimelineTabsUrl(TimelineType.template, urlSearch));
    },
    [history, urlSearch]
  );
  const getFilterOrTabs: (timelineTabsStyle: TimelineTabsStyle) => TimelineTab[] = useCallback(
    (timelineTabsStyle: TimelineTabsStyle) => [
      {
        id: TimelineType.default,
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TIMELINES)
            : i18n.TAB_TIMELINES,
        href: formatUrl(getTimelineTabsUrl(TimelineType.default, urlSearch)),
        disabled: false,
        withNext: true,
        count:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? defaultTimelineCount ?? undefined
            : undefined,
        onClick: goToTimeline,
      },
      {
        id: TimelineType.template,
        name:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? i18n.FILTER_TIMELINES(i18n.TAB_TEMPLATES)
            : i18n.TAB_TEMPLATES,
        href: formatUrl(getTimelineTabsUrl(TimelineType.template, urlSearch)),
        disabled: false,
        withNext: false,
        count:
          timelineTabsStyle === TimelineTabsStyle.filter
            ? templateTimelineCount ?? undefined
            : undefined,
        onClick: goToTemplateTimeline,
      },
    ],
    [
      defaultTimelineCount,
      templateTimelineCount,
      urlSearch,
      formatUrl,
      goToTimeline,
      goToTemplateTimeline,
    ]
  );

  const onFilterClicked = useCallback(
    (tabId, tabStyle: TimelineTabsStyle) => {
      setTimelineTypes((prevTimelineTypes) => {
        if (tabId === prevTimelineTypes && tabStyle === TimelineTabsStyle.filter) {
          return null;
        } else if (prevTimelineTypes !== tabId) {
          setTimelineTypes(tabId);
        }
        return prevTimelineTypes;
      });
    },
    [setTimelineTypes]
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
              onClick={(ev) => {
                tab.onClick(ev);
                onFilterClicked(tab.id, TimelineTabsStyle.tab);
              }}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName]);

  const timelineFilters = useMemo(() => {
    return getFilterOrTabs(TimelineTabsStyle.filter).map((tab: TimelineTab) => (
      <EuiFilterButton
        hasActiveFilters={tab.id === timelineType}
        key={`timeline-${TimelineTabsStyle.filter}-${tab.id}`}
        numFilters={tab.count}
        onClick={(ev: { preventDefault: () => void }) => {
          tab.onClick(ev);
          onFilterClicked(tab.id, TimelineTabsStyle.filter);
        }}
        withNext={tab.withNext}
      >
        {tab.name}
      </EuiFilterButton>
    ));
  }, [timelineType, getFilterOrTabs, onFilterClicked]);

  return {
    timelineType,
    timelineTabs,
    timelineFilters,
  };
};
