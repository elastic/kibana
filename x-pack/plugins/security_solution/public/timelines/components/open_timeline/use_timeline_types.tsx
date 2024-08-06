/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';

import { noop } from 'lodash/fp';
import { type TimelineType, TimelineTypeEnum } from '../../../../common/api/timeline';
import { SecurityPageName } from '../../../app/types';
import { getTimelineTabsUrl, useFormatUrl } from '../../../common/components/link_to';
import * as i18n from './translations';
import type { TimelineTab } from './types';
import { TimelineTabsStyle } from './types';
import { useKibana } from '../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
export interface UseTimelineTypesArgs {
  defaultTimelineCount?: number | null;
  templateTimelineCount?: number | null;
}

export interface UseTimelineTypesResult {
  timelineType: TimelineType | null;
  timelineTabs: JSX.Element;
  timelineFilters: JSX.Element;
}

export const useTimelineTypes = ({
  defaultTimelineCount,
  templateTimelineCount,
}: UseTimelineTypesArgs): UseTimelineTypesResult => {
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.timelines);
  const { navigateToUrl } = useKibana().services.application;
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();
  const [timelineType, setTimelineTypes] = useState<TimelineType | null>(
    tabName === TimelineTypeEnum.default || tabName === TimelineTypeEnum.template
      ? tabName
      : TimelineTypeEnum.default
  );

  const notesEnabled = useIsExperimentalFeatureEnabled('securitySolutionNotesEnabled');

  const timelineUrl = useMemo(() => {
    return formatUrl(getTimelineTabsUrl(TimelineTypeEnum.default, urlSearch));
  }, [formatUrl, urlSearch]);
  const templateUrl = useMemo(() => {
    return formatUrl(getTimelineTabsUrl(TimelineTypeEnum.template, urlSearch));
  }, [formatUrl, urlSearch]);

  const notesUrl = useMemo(() => {
    return formatUrl(getTimelineTabsUrl('notes', urlSearch));
  }, [formatUrl, urlSearch]);

  const goToTimeline = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToUrl(timelineUrl);
    },
    [navigateToUrl, timelineUrl]
  );

  const goToTemplateTimeline = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToUrl(templateUrl);
    },
    [navigateToUrl, templateUrl]
  );

  const goToNotes = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToUrl(notesUrl);
    },
    [navigateToUrl, notesUrl]
  );

  const getFilterOrTabs: (timelineTabsStyle: TimelineTabsStyle) => TimelineTab[] = useCallback(
    (timelineTabsStyle: TimelineTabsStyle) => [
      {
        id: TimelineTypeEnum.default,
        name: i18n.TAB_TIMELINES,
        href: timelineUrl,
        disabled: false,

        onClick: timelineTabsStyle === TimelineTabsStyle.tab ? goToTimeline : noop,
      },
      {
        id: TimelineTypeEnum.template,
        name: i18n.TAB_TEMPLATES,
        href: templateUrl,
        disabled: false,

        onClick: timelineTabsStyle === TimelineTabsStyle.tab ? goToTemplateTimeline : noop,
      },
    ],
    [timelineUrl, templateUrl, goToTimeline, goToTemplateTimeline]
  );

  const onFilterClicked = useCallback(
    (tabId, tabStyle: TimelineTabsStyle) => {
      setTimelineTypes((prevTimelineTypes) => {
        if (prevTimelineTypes !== tabId) {
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
          {notesEnabled && (
            <EuiTab
              data-test-subj="timeline-notes"
              isSelected={tabName === 'notes'}
              key="timeline-notes"
              href={notesUrl}
              onClick={goToNotes}
            >
              {'Notes'}
            </EuiTab>
          )}
        </EuiTabs>
        <EuiSpacer size="m" />
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName]);

  const timelineFilters = useMemo(() => {
    return (
      <EuiTabs>
        {getFilterOrTabs(TimelineTabsStyle.filter).map((tab: TimelineTab) => (
          <EuiTab
            data-test-subj={`open-timeline-modal-body-${TimelineTabsStyle.filter}-${tab.id}`}
            isSelected={tab.id === timelineType}
            key={`timeline-${TimelineTabsStyle.filter}-${tab.id}`}
            onClick={(ev: { preventDefault: () => void }) => {
              tab.onClick(ev);
              onFilterClicked(tab.id, TimelineTabsStyle.filter);
            }}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    );
  }, [timelineType, getFilterOrTabs, onFilterClicked]);

  return {
    timelineType,
    timelineTabs,
    timelineFilters,
  };
};
