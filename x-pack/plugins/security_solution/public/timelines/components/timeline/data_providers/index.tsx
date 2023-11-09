/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rgba } from 'polished';
import { useDispatch } from 'react-redux';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { EuiToolTip, EuiSuperSelect } from '@elastic/eui';

import { createGlobalStyle } from '@kbn/react-kibana-context-styled';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';
import { droppableTimelineProvidersPrefix } from '../../../../common/components/drag_and_drop/helpers';

import { Empty } from './empty';
import { Providers } from './providers';
import { timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';

import * as i18n from './translations';
import { options } from '../search_or_filter/helpers';
import type { KqlMode } from '../../../store/timeline/model';
import { updateKqlMode } from '../../../store/timeline/actions';

interface Props {
  timelineId: string;
}

const DropTargetDataProvidersContainer = styled.div`
  position: relative;
  padding: 20px 0 0px 0;

  .${IS_DRAGGING_CLASS_NAME} & .drop-target-data-providers {
    background: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.1)};
    border: 0.2rem dashed ${({ theme }) => theme.eui.euiColorSuccess};

    & .timeline-drop-area-empty__text {
      color: ${({ theme }) => theme.eui.euiColorSuccess};
    }

    & .euiFormHelpText {
      color: ${({ theme }) => theme.eui.euiColorSuccess};
    }
  }
`;

const DropTargetDataProviders = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-bottom: 8px;
  padding-top: 28px;
  position: relative;
  border: 0.2rem dashed ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: 5px;
  /* padding: ${({ theme }) => theme.eui.euiSizeXS} 0; */
  margin: 0px 0 0px 0;
  max-height: 33vh;
  min-height: 100px;
  overflow: auto;
  resize: vertical;
  background-color: ${({ theme }) => theme.eui.euiFormBackgroundColor};
`;

DropTargetDataProviders.displayName = 'DropTargetDataProviders';

const getDroppableId = (id: string): string =>
  `${droppableTimelineProvidersPrefix}${id}${uuidv4()}`;

/**
 * Renders the data providers section of the timeline.
 *
 * The data providers section is a drop target where users
 * can drag-and drop new data providers into the timeline.
 *
 * It renders an interactive card representation of the
 * data providers. It also provides uniform
 * UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 *
 * Given an empty collection of DataProvider[], it prompts
 * the user to drop anything with a facet count into
 * the data pro section.
 */

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';

const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = '352px';

const SearchOrFilterGlobalStyle = createGlobalStyle`
  .${timelineSelectModeItemsClassName} {
    width: 350px !important;
  }

  .${searchOrFilterPopoverClassName}.euiPopover__panel {
    width: ${searchOrFilterPopoverWidth} !important;

    .euiSuperSelect__listbox {
      width: ${searchOrFilterPopoverWidth} !important;
    }
  }

  [data-test-subj="timeline-select-search-or-filter"] {
    height: auto
  }
`;

const CustomTooltipDiv = styled.div`
  position: absolute;
  left: 20px;
  transform: translateY(-50%);
  z-index: 9999;
`;

export const DataProviders = React.memo<Props>(({ timelineId }) => {
  const dispatch = useDispatch();
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const isLoading = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isLoading
  );
  const dataProviders = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).dataProviders
  );
  const droppableId = useMemo(() => getDroppableId(timelineId), [timelineId]);

  const kqlMode = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).kqlMode
  );

  const handleChange = useCallback(
    (mode: KqlMode) => {
      dispatch(updateKqlMode({ id: timelineId, kqlMode: mode }));
    },
    [timelineId, dispatch]
  );

  const popoverProps = useMemo(
    () => ({
      className: searchOrFilterPopoverClassName,
      panelClassName: searchOrFilterPopoverClassName,
    }),
    []
  );

  return (
    <>
      <SearchOrFilterGlobalStyle />
      <DropTargetDataProvidersContainer
        aria-label={i18n.QUERY_AREA_ARIA_LABEL}
        className="drop-target-data-providers-container"
      >
        <CustomTooltipDiv>
          <EuiToolTip
            className="timeline-select-search-filter-tooltip"
            content={i18n.FILTER_OR_SEARCH_WITH_KQL}
          >
            <EuiSuperSelect
              data-test-subj="timeline-select-search-or-filter"
              hasDividers={true}
              itemLayoutAlign="top"
              itemClassName={timelineSelectModeItemsClassName}
              onChange={handleChange}
              options={options}
              popoverProps={popoverProps}
              valueOfSelected={kqlMode}
            />
          </EuiToolTip>
        </CustomTooltipDiv>
        <DropTargetDataProviders
          className="drop-target-data-providers"
          data-test-subj="dataProviders"
        >
          {dataProviders != null && dataProviders.length ? (
            <Providers
              browserFields={browserFields}
              timelineId={timelineId}
              dataProviders={dataProviders}
            />
          ) : (
            <DroppableWrapper isDropDisabled={isLoading} droppableId={droppableId}>
              <Empty browserFields={browserFields} timelineId={timelineId} />
            </DroppableWrapper>
          )}
        </DropTargetDataProviders>
      </DropTargetDataProvidersContainer>
    </>
  );
});

DataProviders.displayName = 'DataProviders';
