/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { FilterManager } from '@kbn/data-plugin/public';

import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';

import type { TimelineStatusLiteralWithNull } from '../../../../../../../common/api/timeline';
import { TimelineStatus, TimelineType } from '../../../../../../../common/api/timeline';
import { timelineSelectors } from '../../../../../store';
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../../store/defaults';
import * as i18n from './translations';
import { StatefulSearchOrFilter } from '../../../search_or_filter';
import { DataProviders } from '../../../data_providers';

interface Props {
  filterManager: FilterManager;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  status: TimelineStatusLiteralWithNull;
  timelineId: string;
}

const DataProvidersContainer = styled.div<{ $shouldShowQueryBuilder: boolean }>`
  position: relative;
  width: 100%;
  transition: 0.5s ease-in-out;
  overflow: hidden;

  ${(props) =>
    props.$shouldShowQueryBuilder
      ? `display: block; max-height: 300px; visibility: visible; margin-block-start: 0px;`
      : `display: block; max-height: 0px; visibility: hidden; margin-block-start:-${euiThemeVars.euiSizeS};`}

  .${IS_DRAGGING_CLASS_NAME} & {
    display: block;
    max-height: 300px;
    visibility: visible;
    margin-block-start: 0px;
  }
`;

const QueryTabHeaderComponent: React.FC<Props> = ({
  filterManager,
  show,
  showCallOutUnauthorizedMsg,
  status,
  timelineId,
}) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const getIsDataProviderVisible = useMemo(
    () => timelineSelectors.dataProviderVisibilitySelector(),
    []
  );

  const timelineType = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).timelineType
  );

  const isDataProviderVisible = useDeepEqualSelector(
    (state) => getIsDataProviderVisible(state, timelineId) ?? timelineDefaults.isDataProviderVisible
  );

  const shouldShowQueryBuilder = isDataProviderVisible || timelineType === TimelineType.template;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem>
        <StatefulSearchOrFilter filterManager={filterManager} timelineId={timelineId} />
      </EuiFlexItem>
      {showCallOutUnauthorizedMsg && (
        <EuiFlexItem>
          <EuiCallOut
            data-test-subj="timelineCallOutUnauthorized"
            title={i18n.CALL_OUT_UNAUTHORIZED_MSG}
            color="warning"
            iconType="warning"
            size="s"
          />
        </EuiFlexItem>
      )}
      {status === TimelineStatus.immutable && (
        <EuiFlexItem>
          <EuiCallOut
            data-test-subj="timelineImmutableCallOut"
            title={i18n.CALL_OUT_IMMUTABLE}
            color="primary"
            iconType="warning"
            size="s"
          />
        </EuiFlexItem>
      )}
      {show ? (
        <DataProvidersContainer
          className="data-providers-container"
          $shouldShowQueryBuilder={shouldShowQueryBuilder}
        >
          <DataProviders timelineId={timelineId} />
        </DataProvidersContainer>
      ) : null}
    </EuiFlexGroup>
  );
};

export const QueryTabHeader = React.memo(QueryTabHeaderComponent);
