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
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { createHistoryEntry } from '../../../../common/utils/global_query_string/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import type { State } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { focusActiveTimelineButton } from '../../timeline/helpers';
import { combineQueries } from '../../../../common/lib/kuery';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import * as i18n from './translations';
import { TimelineActionMenu } from '../action_menu';
import { AddToFavoritesButton } from '../../timeline/properties/helpers';
import { TimelineStatusInfo } from '../../status_info';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useTimelineTitle } from '../../../hooks/use_timeline_title';

interface TimelineModalHeaderProps {
  /**
   * Id of the timeline to be displayed within the portal
   */
  timelineId: string;
}

/**
 * This component renders the header for the timeline portal, the timeline title, it's saved status and all the actions
 * that users can perform (new timeline, add to favorites, save...).
 * The header should not be renders when the timeline is displayed in full screen mode.
 */
export const TimelineModalHeader: React.FC<TimelineModalHeaderProps> = React.memo(
  ({ timelineId }) => {
    const dispatch = useDispatch();
    const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.timeline);
    const { uiSettings } = useKibana().services;
    const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const { activeTab, dataProviders, filters, kqlMode, kqlQuery, timelineType } =
      useDeepEqualSelector((state) =>
        pick(
          ['activeTab', 'dataProviders', 'filters', 'kqlMode', 'kqlQuery', 'timelineType'],
          getTimeline(state, timelineId) ?? timelineDefaults
        )
      );
    const isDataInTimeline = useMemo(
      () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      [dataProviders, kqlQuery]
    );

    const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);

    const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId));

    const kqlQueryExpression =
      isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
        ? ' '
        : kqlQueryTimeline ?? '';

    const kqlQueryObj = useMemo(
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
          kqlQuery: kqlQueryObj,
          kqlMode,
        }),
      [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQueryObj]
    );

    const handleClose = useCallback(() => {
      createHistoryEntry();
      dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
      focusActiveTimelineButton();
    }, [dispatch, timelineId]);

    const title = useTimelineTitle({ timelineId });

    const { euiTheme } = useEuiTheme();

    return (
      <EuiPanel paddingSize="s" hasShadow={false} data-test-subj="timeline-flyout-header-panel">
        <EuiFlexGroup
          className="eui-scrollBar"
          alignItems="center"
          gutterSize="s"
          responsive={false}
          justifyContent="spaceBetween"
          css={css`
            overflow-x: auto;
            padding: 0 ${euiTheme.size.xs};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText grow={false} data-test-subj="timeline-title">
                  <h3>{title}</h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TimelineStatusInfo timelineId={timelineId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddToFavoritesButton timelineId={timelineId} compact />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <TimelineActionMenu
                timelineId={timelineId}
                activeTab={activeTab}
                isInspectButtonDisabled={
                  !isDataInTimeline || combinedQueries?.filterQuery === undefined
                }
              />
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
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

TimelineModalHeader.displayName = 'TimelineModalHeader';
