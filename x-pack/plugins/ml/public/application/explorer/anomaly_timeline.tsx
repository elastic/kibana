/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import DragSelect from 'dragselect';
import {
  EuiPanel,
  EuiPopover,
  EuiContextMenuPanel,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DRAG_SELECT_ACTION, VIEW_BY_JOB_LABEL } from './explorer_constants';
import { AddToDashboardControl } from './add_to_dashboard_control';
import { useMlKibana } from '../contexts/kibana';
import { TimeBuckets } from '../util/time_buckets';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { SelectLimit } from './select_limit';
import {
  ALLOW_CELL_RANGE_SELECTION,
  dragSelect$,
  explorerService,
} from './explorer_dashboard_service';
import { ExplorerState } from './reducers/explorer_reducer';
import { hasMatchingPoints } from './has_matching_points';
import { ExplorerNoInfluencersFound } from './components/explorer_no_influencers_found/explorer_no_influencers_found';
import { LoadingIndicator } from '../components/loading_indicator';
import { SwimlaneContainer } from './swimlane_container';

function mapSwimlaneOptionsToEuiOptions(options: string[]) {
  return options.map((option) => ({
    value: option,
    text: option,
  }));
}

interface AnomalyTimelineProps {
  explorerState: ExplorerState;
  setSelectedCells: (cells?: any) => void;
}

export const AnomalyTimeline: FC<AnomalyTimelineProps> = React.memo(
  ({ explorerState, setSelectedCells }) => {
    const {
      services: { uiSettings },
    } = useMlKibana();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isSwimlaneSelectActive = useRef(false);
    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    const disableDragSelectOnMouseLeave = useRef(true);

    const timeBuckets = useMemo(() => {
      return new TimeBuckets({
        'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
        'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
        dateFormat: uiSettings.get('dateFormat'),
        'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
      });
    }, [uiSettings]);

    const dragSelect = useMemo(
      () =>
        new DragSelect({
          selectorClass: 'ml-swimlane-selector',
          selectables: document.querySelectorAll('.sl-cell'),
          callback(elements) {
            if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
              elements = [elements[0]];
            }

            if (elements.length > 0) {
              dragSelect$.next({
                action: DRAG_SELECT_ACTION.NEW_SELECTION,
                elements,
              });
            }

            disableDragSelectOnMouseLeave.current = true;
          },
          onDragStart(e) {
            let target = e.target;
            while (target && target !== document.body && !target.classList.contains('sl-cell')) {
              target = target.parentNode;
            }
            if (ALLOW_CELL_RANGE_SELECTION && target !== document.body) {
              dragSelect$.next({
                action: DRAG_SELECT_ACTION.DRAG_START,
              });
              disableDragSelectOnMouseLeave.current = false;
            }
          },
          onElementSelect() {
            if (ALLOW_CELL_RANGE_SELECTION) {
              dragSelect$.next({
                action: DRAG_SELECT_ACTION.ELEMENT_SELECT,
              });
            }
          },
        }),
      []
    );

    const {
      filterActive,
      filteredFields,
      maskAll,
      overallSwimlaneData,
      selectedCells,
      selectedJobs,
      viewByLoadedForTimeFormatted,
      viewBySwimlaneData,
      viewBySwimlaneDataLoading,
      viewBySwimlaneFieldName,
      viewBySwimlaneOptions,
    } = explorerState;

    const setSwimlaneSelectActive = useCallback((active: boolean) => {
      if (isSwimlaneSelectActive.current && !active && disableDragSelectOnMouseLeave.current) {
        dragSelect.stop();
        isSwimlaneSelectActive.current = active;
        return;
      }
      if (!isSwimlaneSelectActive.current && active) {
        dragSelect.start();
        dragSelect.clearSelection();
        dragSelect.setSelectables(document.querySelectorAll('.sl-cell'));
        isSwimlaneSelectActive.current = active;
      }
    }, []);
    const onSwimlaneEnterHandler = () => setSwimlaneSelectActive(true);
    const onSwimlaneLeaveHandler = () => setSwimlaneSelectActive(false);

    // Listens to render updates of the swimlanes to update dragSelect
    const swimlaneRenderDoneListener = useCallback(() => {
      dragSelect.clearSelection();
      dragSelect.setSelectables(document.querySelectorAll('.sl-cell'));
    }, []);

    // Listener for click events in the swimlane to load corresponding anomaly data.
    const swimlaneCellClick = useCallback((selectedCellsUpdate: any) => {
      // If selectedCells is an empty object we clear any existing selection,
      // otherwise we save the new selection in AppState and update the Explorer.
      if (Object.keys(selectedCellsUpdate).length === 0) {
        setSelectedCells();
      } else {
        setSelectedCells(selectedCellsUpdate);
      }
    }, []);

    const showOverallSwimlane =
      overallSwimlaneData !== null &&
      overallSwimlaneData.laneLabels &&
      overallSwimlaneData.laneLabels.length > 0;

    const showViewBySwimlane =
      viewBySwimlaneData !== null &&
      viewBySwimlaneData.laneLabels &&
      viewBySwimlaneData.laneLabels.length > 0;

    const jobIds = selectedJobs ? selectedJobs.map((job) => job.id) : null;

    console.log('___render___');

    return (
      <EuiPanel paddingSize="s">
        <EuiFlexGroup direction="row" gutterSize="m" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle className="panel-title">
              <h2>
                <FormattedMessage
                  id="xpack.ml.explorer.anomalyTimelineTitle"
                  defaultMessage="Anomaly timeline"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {viewBySwimlaneOptions.length > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    <span className="eui-textNoWrap">
                      <FormattedMessage
                        id="xpack.ml.explorer.viewByLabel"
                        defaultMessage="View by"
                      />
                    </span>
                  }
                  display={'columnCompressed'}
                >
                  <EuiSelect
                    compressed
                    id="selectViewBy"
                    options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                    value={viewBySwimlaneFieldName}
                    onChange={(e) => explorerService.setViewBySwimlaneFieldName(e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    <span className="eui-textNoWrap">
                      <FormattedMessage id="xpack.ml.explorer.limitLabel" defaultMessage="Limit" />
                    </span>
                  }
                  display={'columnCompressed'}
                >
                  <SelectLimit />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                <EuiFormRow label="&#8203;">
                  <div className="panel-sub-title">
                    {viewByLoadedForTimeFormatted && (
                      <FormattedMessage
                        id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                        defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                        values={{ viewByLoadedForTimeFormatted }}
                      />
                    )}
                    {viewByLoadedForTimeFormatted === undefined && (
                      <FormattedMessage
                        id="xpack.ml.explorer.sortedByMaxAnomalyScoreLabel"
                        defaultMessage="(Sorted by max anomaly score)"
                      />
                    )}
                    {filterActive === true && viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL && (
                      <FormattedMessage
                        id="xpack.ml.explorer.jobScoreAcrossAllInfluencersLabel"
                        defaultMessage="(Job score across all influencers)"
                      />
                    )}
                  </div>
                </EuiFormRow>
              </EuiFlexItem>
            </>
          )}

          <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  size="s"
                  aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                    defaultMessage: 'Actions',
                  })}
                  color="subdued"
                  iconType="boxesHorizontal"
                  onClick={() => {
                    setIsMenuOpen(!isMenuOpen);
                  }}
                />
              }
              isOpen={isMenuOpen}
              closePopover={() => {
                setIsMenuOpen(false);
              }}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel>
                <AddToDashboardControl jobIds={jobIds!} swimlaneType={'overall'} />
              </EuiContextMenuPanel>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <div
          className="ml-explorer-swimlane euiText"
          onMouseEnter={onSwimlaneEnterHandler}
          onMouseLeave={onSwimlaneLeaveHandler}
          data-test-subj="mlAnomalyExplorerSwimlaneOverall"
        >
          {showOverallSwimlane && (
            <SwimlaneContainer
              filterActive={filterActive}
              maskAll={maskAll}
              timeBuckets={timeBuckets}
              swimlaneCellClick={swimlaneCellClick}
              swimlaneData={overallSwimlaneData}
              swimlaneType={'overall'}
              selection={selectedCells}
              swimlaneRenderDoneListener={swimlaneRenderDoneListener}
              onResize={(width) => explorerService.setSwimlaneContainerWidth(width)}
            />
          )}
        </div>

        {viewBySwimlaneOptions.length > 0 && showViewBySwimlane && (
          <>
            <EuiSpacer size="m" />
            <div
              className="ml-explorer-swimlane euiText"
              onMouseEnter={onSwimlaneEnterHandler}
              onMouseLeave={onSwimlaneLeaveHandler}
              data-test-subj="mlAnomalyExplorerSwimlaneViewBy"
            >
              <SwimlaneContainer
                filterActive={filterActive}
                maskAll={
                  maskAll &&
                  !hasMatchingPoints({
                    filteredFields,
                    swimlaneData: viewBySwimlaneData,
                  })
                }
                timeBuckets={timeBuckets}
                swimlaneCellClick={swimlaneCellClick}
                swimlaneData={viewBySwimlaneData}
                swimlaneType={'viewBy'}
                selection={selectedCells}
                swimlaneRenderDoneListener={swimlaneRenderDoneListener}
                onResize={(width) => explorerService.setSwimlaneContainerWidth(width)}
              />
            </div>
            {viewBySwimlaneDataLoading && <LoadingIndicator />}

            {!showViewBySwimlane &&
              !viewBySwimlaneDataLoading &&
              viewBySwimlaneFieldName !== null && (
                <ExplorerNoInfluencersFound
                  viewBySwimlaneFieldName={viewBySwimlaneFieldName}
                  showFilterMessage={filterActive === true}
                />
              )}
          </>
        )}
      </EuiPanel>
    );
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps.explorerState, nextProps.explorerState);
  }
);
