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
  EuiButton,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { isEmpty, get } from 'lodash/fp';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineType } from '../../../../../common/types/timeline';
import { timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { Description, Name, StarIcon } from '../../timeline/properties/helpers';
import { UNTITLED_TIMELINE, UNTITLED_TEMPLATE } from '../../timeline/properties/translations';
import { useCreateTimeline } from '../../timeline/properties/use_create_timeline';
import { AddToCaseButton } from '../add_to_case_button';
import { AddTimelineButton } from '../add_timeline_button';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { InspectButton } from '../../../../common/components/inspect';
import * as i18n from './translations';

interface FlyoutHeaderProps {
  timelineId: string;
}

interface FlyoutHeaderPanelProps {
  timelineId: string;
  onClose: () => void;
  usersViewing: string[];
}

interface ActiveTimelinesProps {
  timelineId: string;
  timelineTitle: string;
  timelineType: TimelineType;
}

const ActiveTimelines: React.FC<ActiveTimelinesProps> = ({
  timelineId,
  timelineType,
  timelineTitle,
}) => {
  const { handleCreateNewTimeline } = useCreateTimeline({ timelineId, timelineType });

  const title = !isEmpty(timelineTitle)
    ? timelineTitle
    : timelineType === TimelineType.template
    ? UNTITLED_TEMPLATE
    : UNTITLED_TIMELINE;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={handleCreateNewTimeline} iconType="cross" iconSide="right">
          {title}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({
  timelineId,
  usersViewing,
  onClose,
}) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const { dataProviders, kqlQuery, title, timelineType } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const isDataInTimeline = useMemo(
    () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
    [dataProviders, kqlQuery]
  );

  return (
    <EuiPanel grow={false} paddingSize="s" hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <AddTimelineButton timelineId={timelineId} usersViewing={usersViewing} />
        <EuiFlexItem grow>
          <ActiveTimelines
            timelineId={timelineId}
            timelineType={timelineType}
            timelineTitle={title}
          />
        </EuiFlexItem>
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
                  onClick={onClose}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const FlyoutHeaderPanel = React.memo(FlyoutHeaderPanelComponent);

const FlyoutHeaderComponent: React.FC<FlyoutHeaderProps> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();

  const { timelineType } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem>
            <EuiPanel hasShadow={false}>
              <EuiFlexGroup direction="column" data-test-subj="properties-left" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <Name timelineId={timelineId} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <SaveTimelineButton timelineId={timelineId} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
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
            </EuiPanel>
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
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};

FlyoutHeaderComponent.displayName = 'FlyoutHeaderComponent';

export const FlyoutHeader = React.memo(FlyoutHeaderComponent);
