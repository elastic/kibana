/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiBadge,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Dispatch } from 'redux';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { CellValueElementProps } from '../cell_rendering';
import { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers/index';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { TimelineHeader } from '../header';
import { calculateTotalPages, combineQueries } from '../helpers';
import { TimelineRefetch } from '../refetch_timeline';
import { FilterManager } from '../../../../../../../../src/plugins/data/public';
import { getEsQueryConfig } from '../../../../../../../../src/plugins/data/common';
import {
  ControlColumnProps,
  KueryFilterQueryKind,
  RowRenderer,
  TimelineId,
  TimelineTabs,
  ToggleDetailPanel,
} from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { TimelineDatePickerLock } from '../date_picker_lock';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { DetailsPanel } from '../../side_panel';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { HeaderActions } from '../body/actions/header_actions';
import { getDefaultControlColumn } from '../body/control_columns';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { Sourcerer } from '../../../../common/components/sourcerer';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

interface Props {
  timelineId: TimelineId;
}

const SessionTabContent: React.FC<Props> = ({ timelineId }) => {
  const { sessionView } = useKibana().services;
  const dispatch = useDispatch();

  const setSessionViewId = useCallback(
    (eventId: string) => {
      dispatch(timelineActions.updateTimelineSessionViewEventId({ id: timelineId, eventId }));
      dispatch(timelineActions.updateTimelineSessionViewSessionId({ id: timelineId, eventId }));
    },
    [dispatch, timelineId]
  );

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const sessionViewId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewId
  );
  const sessionViewSessionId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewSessionId
  );
  const sessionViewTableProcessTree = useMemo(() => {
    return sessionView.getSessionViewTableProcessTree({ onOpenSessionView: setSessionViewId });
  }, [sessionView, setSessionViewId]);
  const sessionViewMain = useMemo(() => {
    return sessionViewId !== null ? sessionView.getSessionView(sessionViewId) : null;
  }, [sessionView, sessionViewId]);
  console.log(sessionViewId);
  return (
    <FullWidthFlexGroup gutterSize="none">
      <ScrollableFlexItem grow={2}>
        {sessionViewTableProcessTree}
        {/* {sessionViewMain} */}
      </ScrollableFlexItem>
    </FullWidthFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default SessionTabContent;
