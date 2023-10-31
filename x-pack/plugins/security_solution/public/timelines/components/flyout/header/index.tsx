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
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type { State } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { AddTimelineButton } from '../add_timeline_button';
import { useKibana } from '../../../../common/lib/kibana';
import { InspectButton } from '../../../../common/components/inspect';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { focusActiveTimelineButton } from '../../timeline/helpers';
import { combineQueries } from '../../../../common/lib/kuery';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ActiveTimelines } from './active_timelines';
import * as i18n from './translations';

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

  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      borderRadius="none"
      grow={false}
      paddingSize="s"
      hasShadow={false}
      data-test-subj="timeline-flyout-header-panel"
      style={{ backgroundColor: euiTheme.colors.emptyShade, color: euiTheme.colors.text }}
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
                    inputId={InputsModelId.timeline}
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
    </EuiPanel>
  );
};

export const FlyoutHeaderPanel = React.memo(FlyoutHeaderPanelComponent);
