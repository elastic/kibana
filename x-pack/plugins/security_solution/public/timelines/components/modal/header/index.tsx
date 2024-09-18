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
import { useDispatch, useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import styled from 'styled-components';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../../timeline/tour/step_config';
import { NewTimelineButton } from '../actions/new_timeline_button';
import { OpenTimelineButton } from '../actions/open_timeline_button';
import { APP_ID } from '../../../../../common';
import {
  selectDataInTimeline,
  selectKqlQuery,
  selectTimelineById,
  selectTitleByTimelineById,
} from '../../../store/selectors';
import { createHistoryEntry } from '../../../../common/utils/global_query_string/helpers';
import { timelineActions } from '../../../store';
import type { State } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { combineQueries } from '../../../../common/lib/kuery';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import * as i18n from '../translations';
import { AddToFavoritesButton } from '../../add_to_favorites';
import { TimelineSaveStatus } from '../../save_status';
import { InspectButton } from '../../../../common/components/inspect';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { AttachToCaseButton } from '../actions/attach_to_case_button';
import { SaveTimelineButton } from '../actions/save_timeline_button';

const whiteSpaceNoWrapCSS = { 'white-space': 'nowrap' };
const autoOverflowXCSS = { 'overflow-x': 'auto' };
const VerticalDivider = styled.span`
  width: 0;
  height: 20px;
  border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;
const TimelinePanel = euiStyled(EuiPanel)`
  backgroundColor: ${(props) => props.theme.eui.euiColorEmptyShade};
  color: ${(props) => props.theme.eui.euiTextColor};
  padding-inline: ${(props) => props.theme.eui.euiSizeM};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
`;

interface FlyoutHeaderPanelProps {
  /**
   * Id of the timeline to be displayed within the modal
   */
  timelineId: string;
  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * Component rendered at the top of the timeline modal. It contains the timeline title, all the action buttons (save, open, favorite...) and the close button
 */
export const TimelineModalHeader = React.memo<FlyoutHeaderPanelProps>(
  ({ timelineId, openToggleRef }) => {
    const dispatch = useDispatch();
    const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.timeline);
    const { cases, uiSettings } = useKibana().services;
    const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
    const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

    const title = useSelector((state: State) => selectTitleByTimelineById(state, timelineId));
    const isDataInTimeline = useSelector((state: State) => selectDataInTimeline(state, timelineId));
    const kqlQueryObj = useSelector((state: State) => selectKqlQuery(state, timelineId));

    const { activeTab, dataProviders, timelineType, filters, kqlMode } = useSelector(
      (state: State) => selectTimelineById(state, timelineId)
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
    const isInspectDisabled = !isDataInTimeline || combinedQueries?.filterQuery === undefined;

    const closeTimeline = useCallback(() => {
      if (openToggleRef.current != null) {
        openToggleRef.current.focus();
      }
      createHistoryEntry();
      dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    }, [dispatch, timelineId, openToggleRef]);

    return (
      <TimelinePanel
        grow={false}
        paddingSize="s"
        hasShadow={false}
        data-test-subj="timeline-modal-header-panel"
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
                <AddToFavoritesButton timelineId={timelineId} isPartOfGuidedTour />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  grow={false}
                  data-test-subj="timeline-modal-header-title"
                  css={whiteSpaceNoWrapCSS}
                >
                  <h3>{title}</h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TimelineSaveStatus timelineId={timelineId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              id={TIMELINE_TOUR_CONFIG_ANCHORS.ACTION_MENU}
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="xs"
              responsive={false}
              data-test-subj="timeline-modal-header-actions"
            >
              <EuiFlexItem>
                <NewTimelineButton timelineId={timelineId} />
              </EuiFlexItem>
              <EuiFlexItem>
                <OpenTimelineButton />
              </EuiFlexItem>
              <EuiFlexItem>
                <InspectButton
                  queryId={`${timelineId}-${activeTab}`}
                  inputId={InputsModelId.timeline}
                  isDisabled={isInspectDisabled}
                />
              </EuiFlexItem>
              {userCasesPermissions.create && userCasesPermissions.read ? (
                <>
                  <EuiFlexItem>
                    <VerticalDivider />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <AttachToCaseButton timelineId={timelineId} />
                  </EuiFlexItem>
                </>
              ) : null}
              <EuiFlexItem>
                <SaveTimelineButton timelineId={timelineId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}>
                  <EuiButtonIcon
                    aria-label={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}
                    iconType="cross"
                    data-test-subj="timeline-modal-header-close-button"
                    onClick={closeTimeline}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </TimelinePanel>
    );
  }
);

TimelineModalHeader.displayName = 'TimelineModalHeader';
