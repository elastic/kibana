/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  EuiButtonIcon,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, get } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { FormattedRelative } from '@kbn/i18n/react';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { Description, Name, AddToFavoritesButton } from '../../timeline/properties/helpers';

import { AddToCaseButton } from '../add_to_case_button';
import { AddTimelineButton } from '../add_timeline_button';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { InspectButton } from '../../../../common/components/inspect';
import { ActiveTimelines } from './active_timelines';
import * as i18n from './translations';
import * as commonI18n from '../../timeline/properties/translations';

// to hide side borders
const StyledPanel = styled(EuiPanel)`
  margin: 0 -1px;
`;

interface FlyoutHeaderProps {
  timelineId: string;
}

interface FlyoutHeaderPanelProps {
  timelineId: string;
}

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { dataProviders, kqlQuery, title, timelineType, show } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const isDataInTimeline = useMemo(
    () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
    [dataProviders, kqlQuery]
  );

  const handleClose = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: false })),
    [dispatch, timelineId]
  );

  return (
    <StyledPanel borderRadius="none" grow={false} paddingSize="s" hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <AddTimelineButton timelineId={timelineId} />
        <EuiFlexItem grow>
          <ActiveTimelines
            timelineId={timelineId}
            timelineType={timelineType}
            timelineTitle={title}
            isOpen={show}
          />
        </EuiFlexItem>
        {show && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <InspectButton
                  compact
                  queryId={timelineId}
                  inputId="timeline"
                  inspectIndex={0}
                  isDisabled={!isDataInTimeline}
                  title={i18n.INSPECT_TIMELINE_TITLE}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_TIMELINE}>
                  <EuiButtonIcon
                    aria-label={i18n.CLOSE_TIMELINE}
                    data-test-subj="close-timeline"
                    iconType="cross"
                    onClick={handleClose}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </StyledPanel>
  );
};

export const FlyoutHeaderPanel = React.memo(FlyoutHeaderPanelComponent);

const StyledTimelineHeader = styled(EuiFlexGroup)`
  margin: 0;
  flex: 0;
`;

const RowFlexItem = styled(EuiFlexItem)`
  flex-direction: row;
  align-items: center;
`;

const TimelineName = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { title, timelineType } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const placeholder = useMemo(
    () =>
      timelineType === TimelineType.template
        ? commonI18n.UNTITLED_TEMPLATE
        : commonI18n.UNTITLED_TIMELINE,
    [timelineType]
  );

  const content = useMemo(() => (title.length ? title : placeholder), [title, placeholder]);

  return (
    <>
      <EuiText>
        <h3>{content}</h3>
      </EuiText>
      <SaveTimelineButton timelineId={timelineId} />
    </>
  );
};

const TimelineDescription = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const description = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).description
  );

  const content = useMemo(() => (description.length ? description : commonI18n.DESCRIPTION), [
    description,
  ]);

  return (
    <>
      <EuiText>
        <h3>{content}</h3>
      </EuiText>
      <SaveTimelineButton timelineId={timelineId} />
    </>
  );
};

const TimelineStatusInfo = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { status: timelineStatus, updated } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  const isUnsaved = useMemo(() => timelineStatus === TimelineStatus.draft, [timelineStatus]);

  if (!isUnsaved) {
    return <EuiTextColor color="warning">{'Unsaved'}</EuiTextColor>;
  }

  return (
    <EuiTextColor color="default">
      <FormattedRelative
        data-test-subj="last-updated-at-date"
        key="timeline-status-autosaved"
        value={new Date(updated)}
      />
    </EuiTextColor>
  );
};

const FlyoutHeaderComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  return (
    <StyledTimelineHeader alignItems="center" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup data-test-subj="properties-left" direction="column" gutterSize="s">
          <RowFlexItem>
            <TimelineName timelineId={timelineId} />
          </RowFlexItem>
          <RowFlexItem>
            <TimelineDescription timelineId={timelineId} />
          </RowFlexItem>
          <EuiFlexItem>
            <TimelineStatusInfo timelineId={timelineId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>{/* KPIs PLACEHOLDER */}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AddToFavoritesButton timelineId={timelineId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddToCaseButton timelineId={timelineId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </StyledTimelineHeader>
  );
};

FlyoutHeaderComponent.displayName = 'FlyoutHeaderComponent';

export const FlyoutHeader = React.memo(FlyoutHeaderComponent);
