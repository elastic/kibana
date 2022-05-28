/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { SortFieldTimeline, TimelineType } from '../../../../common/types/timeline';
import { useGetAllTimeline } from '../../../timelines/containers/all';
import {
  queryTimelineById,
  dispatchUpdateTimeline,
} from '../../../timelines/components/open_timeline/helpers';
import { OnOpenTimeline } from '../../../timelines/components/open_timeline/types';
import { updateIsLoading as dispatchUpdateIsLoading } from '../../../timelines/store/timeline/actions';

import { RecentTimelines } from './recent_timelines';
import * as i18n from './translations';
import { FilterMode } from './types';
import { LoadingPlaceholders } from '../loading_placeholders';
import { useTimelineStatus } from '../../../timelines/components/open_timeline/use_timeline_status';
import { useKibana } from '../../../common/lib/kibana';
import { SecurityPageName } from '../../../app/types';
import { APP_UI_ID } from '../../../../common/constants';
import { useFormatUrl } from '../../../common/components/link_to';
import { LinkAnchor } from '../../../common/components/links';
import { Direction } from '../../../../common/search_strategy';

interface Props {
  filterBy: FilterMode;
}

const PAGE_SIZE = 3;

const StatefulRecentTimelinesComponent: React.FC<Props> = ({ filterBy }) => {
  const dispatch = useDispatch();
  const updateIsLoading = useCallback(
    (payload) => dispatch(dispatchUpdateIsLoading(payload)),
    [dispatch]
  );
  const updateTimeline = useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]);

  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
  const { navigateToApp } = useKibana().services.application;
  const onOpenTimeline: OnOpenTimeline = useCallback(
    ({ duplicate, timelineId }) => {
      queryTimelineById({
        duplicate,
        timelineId,
        updateIsLoading,
        updateTimeline,
      });
    },
    [updateIsLoading, updateTimeline]
  );

  const goToTimelines = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.timelines,
      });
    },
    [navigateToApp]
  );

  const noTimelinesMessage =
    filterBy === 'favorites' ? i18n.NO_FAVORITE_TIMELINES : i18n.NO_TIMELINES;

  const linkAllTimelines = useMemo(
    () => (
      <LinkAnchor onClick={goToTimelines} href={formatUrl('')}>
        {i18n.VIEW_ALL_TIMELINES}
      </LinkAnchor>
    ),
    [goToTimelines, formatUrl]
  );
  const loadingPlaceholders = useMemo(
    () => <LoadingPlaceholders lines={2} placeholders={filterBy === 'favorites' ? 1 : PAGE_SIZE} />,
    [filterBy]
  );

  const { fetchAllTimeline, timelines, loading } = useGetAllTimeline();
  const timelineType = TimelineType.default;
  const { timelineStatus } = useTimelineStatus({ timelineType });

  useEffect(() => {
    fetchAllTimeline({
      pageInfo: {
        pageIndex: 1,
        pageSize: PAGE_SIZE,
      },
      search: '',
      sort: {
        sortField: SortFieldTimeline.updated,
        sortOrder: Direction.desc,
      },
      onlyUserFavorite: filterBy === 'favorites',
      status: timelineStatus,
      timelineType,
    });
  }, [fetchAllTimeline, filterBy, timelineStatus, timelineType]);

  return (
    <>
      {loading ? (
        loadingPlaceholders
      ) : (
        <RecentTimelines
          noTimelinesMessage={noTimelinesMessage}
          onOpenTimeline={onOpenTimeline}
          timelines={timelines ?? []}
        />
      )}
      <EuiHorizontalRule margin="s" />
      <EuiText size="xs">{linkAllTimelines}</EuiText>
    </>
  );
};

StatefulRecentTimelinesComponent.displayName = 'StatefulRecentTimelinesComponent';

export const StatefulRecentTimelines = React.memo(StatefulRecentTimelinesComponent);
