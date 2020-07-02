/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { TimelineType } from '../../../../common/types/timeline';
import { useGetAllTimeline } from '../../../timelines/containers/all';
import { SortFieldTimeline, Direction } from '../../../graphql/types';
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
import { APP_ID } from '../../../../common/constants';
import { useFormatUrl } from '../../../common/components/link_to';
import { LinkAnchor } from '../../../common/components/links';

interface OwnProps {
  apolloClient: ApolloClient<{}>;
  filterBy: FilterMode;
}

export type Props = OwnProps & PropsFromRedux;

const PAGE_SIZE = 3;

const StatefulRecentTimelinesComponent = React.memo<Props>(
  ({ apolloClient, filterBy, updateIsLoading, updateTimeline }) => {
    const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
    const { navigateToApp } = useKibana().services.application;
    const onOpenTimeline: OnOpenTimeline = useCallback(
      ({ duplicate, timelineId }: { duplicate: boolean; timelineId: string }) => {
        queryTimelineById({
          apolloClient,
          duplicate,
          timelineId,
          updateIsLoading,
          updateTimeline,
        });
      },
      [apolloClient, updateIsLoading, updateTimeline]
    );

    const goToTimelines = useCallback(
      (ev) => {
        ev.preventDefault();
        navigateToApp(`${APP_ID}:${SecurityPageName.timelines}`);
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
      () => (
        <LoadingPlaceholders lines={2} placeholders={filterBy === 'favorites' ? 1 : PAGE_SIZE} />
      ),
      [filterBy]
    );

    const { fetchAllTimeline, timelines, loading } = useGetAllTimeline();
    const timelineType = TimelineType.default;
    const { templateTimelineType, timelineStatus } = useTimelineStatus({ timelineType });
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
        templateTimelineType,
      });
    }, [fetchAllTimeline, filterBy, timelineStatus, timelineType, templateTimelineType]);

    return (
      <>
        {loading ? (
          loadingPlaceholders
        ) : (
          <RecentTimelines
            noTimelinesMessage={noTimelinesMessage}
            onOpenTimeline={onOpenTimeline}
            timelines={timelines}
          />
        )}
        <EuiHorizontalRule margin="s" />
        <EuiText size="xs">{linkAllTimelines}</EuiText>
      </>
    );
  }
);

StatefulRecentTimelinesComponent.displayName = 'StatefulRecentTimelinesComponent';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(dispatchUpdateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulRecentTimelines = connector(StatefulRecentTimelinesComponent);
