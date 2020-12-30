/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer, EuiFilterButton } from '@elastic/eui';

import { noop } from 'lodash/fp';
import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { getTimelineTabsUrl, useFormatUrl } from '../../../common/components/link_to';
import * as i18n from './translations';
import { TimelineTabsStyle, TimelineTab } from './types';

export interface UseTimelineTypesArgs {
  defaultTimelineCount?: number | null;
  templateTimelineCount?: number | null;
}

export interface UseTimelineTypesResult {
  timelineType: TimelineTypeLiteralWithNull;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element[];
}

export const useTimelineTypes = ({
  defaultTimelineCount,
  templateTimelineCount,
}: UseTimelineTypesArgs): UseTimelineTypesResult => {
  const history = useHistory();
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.timelines);
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();
  const [timelineType, setTimelineTypes] = useState<TimelineTypeLiteralWithNull>(
    tabName === TimelineType.default || tabName === TimelineType.template
      ? tabName
      : TimelineType.default
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
        onClick: timelineTabsStyle === TimelineTabsStyle.tab ? goToTimeline : noop,
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
        onClick: timelineTabsStyle === TimelineTabsStyle.tab ? goToTemplateTimeline : noop,
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
          return tabId === TimelineType.default ? TimelineType.template : TimelineType.default;
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
        <EuiTabs data-test-subj="open-timeline-subtabs">
          {getFilterOrTabs(TimelineTabsStyle.tab).map((tab: TimelineTab) => (
            <EuiTab
              data-test-subj={`timeline-${TimelineTabsStyle.tab}-${tab.id}`}
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
        data-test-subj={`open-timeline-modal-body-${TimelineTabsStyle.filter}-${tab.id}`}
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
