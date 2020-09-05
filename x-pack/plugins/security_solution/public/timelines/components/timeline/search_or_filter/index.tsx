/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';

import { FilterManager, IIndexPattern } from '../../../../../../../../src/plugins/data/public';
import { BrowserFields } from '../../../../common/containers/source';
import { State } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { KqlMode } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { QueryBarTimeline } from '../query_bar';
import { options } from './helpers';
import * as i18n from './translations';
import { PickEventType } from './pick_events';

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';
const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = '352px';

// SIDE EFFECT: the following creates a global class selector
const SearchOrFilterGlobalStyle = createGlobalStyle`
  .${timelineSelectModeItemsClassName} {
    width: 350px !important;
  }

  .${searchOrFilterPopoverClassName}__popoverPanel {
    width: ${searchOrFilterPopoverWidth};

    .euiSuperSelect__listbox {
      width: ${searchOrFilterPopoverWidth} !important;
    }
  }
`;

interface OwnProps {
  browserFields: BrowserFields;
  filterManager: FilterManager;
  indexPattern: IIndexPattern;
  timelineId: string;
}

const SearchOrFilterContainer = styled.div`
  margin: 5px 0 10px 0;
  user-select: none;
  .globalQueryBar {
    padding: 0px;
    .kbnQueryBar {
      div:first-child {
        margin-right: 0px;
      }
    }
  }
`;

SearchOrFilterContainer.displayName = 'SearchOrFilterContainer';

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none;
`;

ModeFlexItem.displayName = 'ModeFlexItem';

const SearchOrFilterComponent: React.FC<OwnProps> = ({
  browserFields,
  filterManager,
  indexPattern,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const kqlMode = useSelector(
    (state: State) => (getTimeline(state, timelineId) ?? timelineDefaults).kqlMode ?? 'filter',
    shallowEqual
  );
  const eventType = useSelector(
    (state: State) => (getTimeline(state, timelineId) ?? timelineDefaults).eventType ?? 'raw',
    shallowEqual
  );
  const handleUpdateKqlMode = useCallback(
    (mode: KqlMode) => dispatch(timelineActions.updateKqlMode({ id: timelineId, kqlMode: mode })),
    [dispatch, timelineId]
  );

  return (
    <>
      <SearchOrFilterContainer>
        <EuiFlexGroup data-test-subj="timeline-search-or-filter" gutterSize="xs">
          <ModeFlexItem grow={false}>
            <EuiToolTip content={i18n.FILTER_OR_SEARCH_WITH_KQL}>
              <EuiSuperSelect
                data-test-subj="timeline-select-search-or-filter"
                hasDividers={true}
                itemLayoutAlign="top"
                itemClassName={timelineSelectModeItemsClassName}
                onChange={handleUpdateKqlMode}
                options={options}
                popoverClassName={searchOrFilterPopoverClassName}
                valueOfSelected={kqlMode}
              />
            </EuiToolTip>
          </ModeFlexItem>
          <EuiFlexItem data-test-subj="timeline-search-or-filter-search-container">
            <QueryBarTimeline
              browserFields={browserFields}
              filterManager={filterManager}
              kqlMode={kqlMode}
              indexPattern={indexPattern}
              timelineId={timelineId}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PickEventType eventType={eventType} timelineId={timelineId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SearchOrFilterContainer>
      <SearchOrFilterGlobalStyle />
    </>
  );
};
SearchOrFilterComponent.displayName = 'SearchOrFilterComponent';

export const SearchOrFilter = React.memo(SearchOrFilterComponent);
