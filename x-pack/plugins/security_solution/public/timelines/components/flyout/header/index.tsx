/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, get } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineType } from '../../../../../common/types/timeline';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { Description, Name, StarIcon } from '../../timeline/properties/helpers';

import { AddToCaseButton } from '../add_to_case_button';
import { AddTimelineButton } from '../add_timeline_button';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { InspectButton } from '../../../../common/components/inspect';
import { ActiveTimelines } from './active_timelines';
import * as i18n from './translations';

const StyledPanel = styled(EuiPanel)`
  border-radius: 0;
`;

interface FlyoutHeaderProps {
  timelineId: string;
}

interface FlyoutHeaderPanelProps {
  timelineId: string;
}

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
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
    <StyledPanel grow={false} paddingSize="s" hasShadow={false}>
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

const FlyoutHeaderComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();

  const { timelineType } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  return (
    <StyledTimelineHeader alignItems="center" gutterSize="xl">
      <EuiFlexItem>
        <EuiFlexGroup data-test-subj="properties-left" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <Name timelineId={timelineId} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <SaveTimelineButton timelineId={timelineId} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <Description timelineId={timelineId} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <SaveTimelineButton timelineId={timelineId} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem>{/* KPIs PLACEHOLDER */}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <StarIcon timelineId={timelineId} />
          </EuiFlexItem>
          {timelineType === TimelineType.default && (
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
