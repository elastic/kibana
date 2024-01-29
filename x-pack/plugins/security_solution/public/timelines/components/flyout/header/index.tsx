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
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { selectTitleByTimelineById } from '../../../store/selectors';
import { createHistoryEntry } from '../../../../common/utils/global_query_string/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../store';
import type { State } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { combineQueries } from '../../../../common/lib/kuery';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import * as i18n from './translations';
import { TimelineActionMenu } from '../action_menu';
import { AddToFavoritesButton } from '../../add_to_favorites';
import { TimelineSaveStatus } from '../../save_status';
import { timelineDefaults } from '../../../store/defaults';

interface FlyoutHeaderPanelProps {
  timelineId: string;
}

const whiteSpaceNoWrapCSS = { 'white-space': 'nowrap' };
const autoOverflowXCSS = { 'overflow-x': 'auto' };

const TimelinePanel = euiStyled(EuiPanel)<{ $isOpen?: boolean }>`
  backgroundColor: ${(props) => props.theme.eui.euiColorEmptyShade};
  color: ${(props) => props.theme.eui.euiTextColor};
  padding-inline: ${(props) => props.theme.eui.euiSizeM};
  border-radius: ${({ $isOpen, theme }) => ($isOpen ? theme.eui.euiBorderRadius : '0px')};
`;

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.timeline);
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);

  const title = useSelector((state: State) => selectTitleByTimelineById(state, timelineId));

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { activeTab, dataProviders, kqlQuery, timelineType, show, filters, kqlMode } =
    useDeepEqualSelector((state) =>
      pick(
        ['activeTab', 'dataProviders', 'kqlQuery', 'timelineType', 'show', 'filters', 'kqlMode'],
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
  }, [dispatch, timelineId]);

  return (
    <TimelinePanel
      $isOpen={show}
      grow={false}
      paddingSize="s"
      hasShadow={false}
      data-test-subj="timeline-flyout-header-panel"
      data-show={show}
    >
      <EuiFlexGroup
        className="eui-scrollBar"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        justifyContent="spaceBetween"
        css={autoOverflowXCSS}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <AddToFavoritesButton timelineId={timelineId} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText grow={false} data-test-subj="timeline-title" css={whiteSpaceNoWrapCSS}>
                <h3>{title}</h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TimelineSaveStatus timelineId={timelineId} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {show && (
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
        )}
      </EuiFlexGroup>
    </TimelinePanel>
  );
};

export const FlyoutHeaderPanel = React.memo(FlyoutHeaderPanelComponent);
