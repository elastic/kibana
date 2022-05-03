/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  EuiButtonIcon,
  EuiText,
  EuiButtonEmpty,
  EuiTextColor,
} from '@elastic/eui';
import React, { MouseEventHandler, MouseEvent, useCallback, useMemo } from 'react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { FormattedRelative } from '@kbn/i18n-react';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import {
  TimelineStatus,
  TimelineTabs,
  TimelineType,
  TimelineId,
} from '../../../../../common/types/timeline';
import { State } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { AddToFavoritesButton } from '../../timeline/properties/helpers';
import { TimerangeInput } from '../../../../../common/search_strategy';
import { AddToCaseButton } from '../add_to_case_button';
import { AddTimelineButton } from '../add_timeline_button';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import { InspectButton } from '../../../../common/components/inspect';
import { useTimelineKpis } from '../../../containers/kpis';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { TimelineModel } from '../../../store/timeline/model';
import {
  startSelector,
  endSelector,
} from '../../../../common/components/super_date_picker/selectors';
import { combineQueries, focusActiveTimelineButton } from '../../timeline/helpers';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ActiveTimelines } from './active_timelines';
import * as i18n from './translations';
import * as commonI18n from '../../timeline/properties/translations';
import { getTimelineStatusByIdSelector } from './selectors';
import { TimelineKPIs } from './kpis';

import { setActiveTabTimeline } from '../../../store/timeline/actions';
import { useIsOverflow } from '../../../../common/hooks/use_is_overflow';

// to hide side borders
const StyledPanel = styled(EuiPanel)`
  margin: 0 -1px 0;
`;

interface FlyoutHeaderProps {
  timelineId: string;
}

interface FlyoutHeaderPanelProps {
  timelineId: string;
}

const ActiveTimelinesContainer = styled(EuiFlexItem)`
  overflow: hidden;
`;

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.timeline);
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    activeTab,
    dataProviders,
    kqlQuery,
    title,
    timelineType,
    status: timelineStatus,
    updated,
    show,
    filters,
    kqlMode,
  } = useDeepEqualSelector((state) =>
    pick(
      [
        'activeTab',
        'dataProviders',
        'kqlQuery',
        'status',
        'title',
        'timelineType',
        'updated',
        'show',
        'filters',
        'kqlMode',
      ],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );
  const isDataInTimeline = useMemo(
    () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
    [dataProviders, kqlQuery]
  );
  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId)!);

  const kqlQueryExpression =
    isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
      ? ' '
      : kqlQueryTimeline;
  const kqlQueryTest = useMemo(
    () => ({ query: kqlQueryExpression, language: 'kuery' }),
    [kqlQueryExpression]
  );

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters: filters ? filters : [],
        kqlQuery: kqlQueryTest,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQueryTest]
  );

  const handleClose = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    focusActiveTimelineButton();
  }, [dispatch, timelineId]);

  return (
    <StyledPanel
      borderRadius="none"
      grow={false}
      paddingSize="s"
      hasShadow={false}
      data-test-subj="timeline-flyout-header-panel"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <AddTimelineButton timelineId={timelineId} />
        <ActiveTimelinesContainer grow={false}>
          <ActiveTimelines
            timelineId={timelineId}
            timelineType={timelineType}
            timelineTitle={title}
            timelineStatus={timelineStatus}
            isOpen={show}
            updated={updated}
          />
        </ActiveTimelinesContainer>
        {show && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              {(activeTab === TimelineTabs.query || activeTab === TimelineTabs.eql) && (
                <EuiFlexItem grow={false}>
                  <InspectButton
                    compact
                    queryId={`${timelineId}-${activeTab}`}
                    inputId="timeline"
                    inspectIndex={0}
                    isDisabled={!isDataInTimeline || combinedQueries?.filterQuery === undefined}
                    title={i18n.INSPECT_TIMELINE_TITLE}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}>
                  <EuiButtonIcon
                    aria-label={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}
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

const StyledDiv = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const ReadMoreButton = ({
  description,
  onclick,
}: {
  description: string;
  onclick: MouseEventHandler<HTMLButtonElement>;
}) => {
  const [isOverflow, ref] = useIsOverflow(description);
  return (
    <>
      <StyledDiv ref={ref}>{description}</StyledDiv>
      {isOverflow && (
        <EuiButtonEmpty flush="left" onClick={onclick}>
          {i18n.READ_MORE}
        </EuiButtonEmpty>
      )}
    </>
  );
};

const StyledTimelineHeader = styled(EuiFlexGroup)`
  ${({ theme }) => `margin: ${theme.eui.euiSizeXS} ${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS};`}
  flex: 0;
`;

const TimelineStatusInfoContainer = styled.span`
  ${({ theme }) => `margin-left: ${theme.eui.euiSizeS};`}
  white-space: nowrap;
`;

const KpisContainer = styled.div`
  ${({ theme }) => `margin-right: ${theme.eui.euiSizeM};`}
`;

const RowFlexItem = styled(EuiFlexItem)`
  flex-direction: row;
  align-items: center;
`;

const TimelineTitleContainer = styled.h3`
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-word;
`;

const TimelineNameComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { title, timelineType } = useDeepEqualSelector((state) =>
    pick(['title', 'timelineType'], getTimeline(state, timelineId) ?? timelineDefaults)
  );
  const placeholder = useMemo(
    () =>
      timelineType === TimelineType.template
        ? commonI18n.UNTITLED_TEMPLATE
        : commonI18n.UNTITLED_TIMELINE,
    [timelineType]
  );

  const content = useMemo(() => title || placeholder, [title, placeholder]);

  return (
    <EuiToolTip content={content} position="bottom">
      <EuiText>
        <TimelineTitleContainer data-test-subj="timeline-title">{content}</TimelineTitleContainer>
      </EuiText>
    </EuiToolTip>
  );
};

const TimelineName = React.memo(TimelineNameComponent);

const TimelineDescriptionComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const description = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).description
  );
  const dispatch = useDispatch();

  const onReadMore: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      dispatch(
        setActiveTabTimeline({
          id: timelineId,
          activeTab: TimelineTabs.notes,
          scrollToTop: true,
        })
      );
    },
    [dispatch, timelineId]
  );

  return (
    <EuiText size="s" data-test-subj="timeline-description">
      <ReadMoreButton description={description || commonI18n.DESCRIPTION} onclick={onReadMore} />
    </EuiText>
  );
};

const TimelineDescription = React.memo(TimelineDescriptionComponent);

const TimelineStatusInfoComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const { status: timelineStatus, updated } = useDeepEqualSelector((state) =>
    getTimelineStatus(state, timelineId)
  );

  const isUnsaved = useMemo(() => timelineStatus === TimelineStatus.draft, [timelineStatus]);

  if (isUnsaved) {
    return (
      <EuiText size="xs">
        <EuiTextColor color="warning" data-test-subj="timeline-status">
          {i18n.UNSAVED}
        </EuiTextColor>
      </EuiText>
    );
  }

  return (
    <EuiText size="xs">
      <EuiTextColor color="default">
        {i18n.AUTOSAVED}{' '}
        <FormattedRelative
          data-test-subj="timeline-status"
          key="timeline-status-autosaved"
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value={new Date(updated!)}
        />
      </EuiTextColor>
    </EuiText>
  );
};

const TimelineStatusInfo = React.memo(TimelineStatusInfoComponent);

const FlyoutHeaderComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const { selectedPatterns, indexPattern, docValueFields, browserFields } = useSourcererDataView(
    SourcererScopeName.timeline
  );
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const isActive = useMemo(() => timelineId === TimelineId.active, [timelineId]);
  const timerange: TimerangeInput = useDeepEqualSelector((state) => {
    if (isActive) {
      return {
        from: getStartSelector(state.inputs.timeline),
        to: getEndSelector(state.inputs.timeline),
        interval: '',
      };
    } else {
      return {
        from: getStartSelector(state.inputs.global),
        to: getEndSelector(state.inputs.global),
        interval: '',
      };
    }
  });
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline: TimelineModel = useSelector(
    (state: State) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const { dataProviders, filters, timelineType, kqlMode, activeTab } = timeline;
  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId)!);

  const kqlQueryExpression =
    isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
      ? ' '
      : kqlQueryTimeline;
  const kqlQuery = useMemo(
    () => ({ query: kqlQueryExpression, language: 'kuery' }),
    [kqlQueryExpression]
  );

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters: filters ? filters : [],
        kqlQuery,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQuery]
  );

  const isBlankTimeline: boolean = useMemo(
    () =>
      (isEmpty(dataProviders) && isEmpty(filters) && isEmpty(kqlQuery.query)) ||
      combinedQueries?.filterQuery === undefined,
    [dataProviders, filters, kqlQuery, combinedQueries]
  );

  const [loading, kpis] = useTimelineKpis({
    defaultIndex: selectedPatterns,
    docValueFields,
    timerange,
    isBlankTimeline,
    filterQuery: combinedQueries?.filterQuery ?? '',
  });

  const hasWritePermissions = useGetUserCasesPermissions()?.crud ?? false;

  return (
    <StyledTimelineHeader alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup data-test-subj="properties-left" direction="column" gutterSize="none">
          <RowFlexItem>
            <TimelineName timelineId={timelineId} />
            <SaveTimelineButton timelineId={timelineId} initialFocus="title" />
            <TimelineStatusInfoContainer>
              <TimelineStatusInfo timelineId={timelineId} />
            </TimelineStatusInfoContainer>
          </RowFlexItem>
          <RowFlexItem>
            <TimelineDescription timelineId={timelineId} />
            <SaveTimelineButton timelineId={timelineId} initialFocus="description" />
          </RowFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <KpisContainer>
          {activeTab === TimelineTabs.query ? (
            <TimelineKPIs kpis={kpis} isLoading={loading} />
          ) : null}
        </KpisContainer>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <AddToFavoritesButton timelineId={timelineId} />
          </EuiFlexItem>
          {hasWritePermissions && (
            <EuiFlexItem grow={false}>
              <AddToCaseButton timelineId={timelineId} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </StyledTimelineHeader>
  );
};

FlyoutHeaderComponent.displayName = 'FlyoutHeaderComponent';

export const FlyoutHeader = React.memo(FlyoutHeaderComponent);
