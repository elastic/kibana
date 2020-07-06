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
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DRAG_SELECT_ACTION, SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from './explorer_constants';
import { AddToDashboardControl } from './add_to_dashboard_control';
import { useMlKibana } from '../contexts/kibana';
import { TimeBuckets } from '../util/time_buckets';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import {
  ALLOW_CELL_RANGE_SELECTION,
  dragSelect$,
  explorerService,
} from './explorer_dashboard_service';
import { ExplorerState } from './reducers/explorer_reducer';
import { hasMatchingPoints } from './has_matching_points';
import { ExplorerNoInfluencersFound } from './components/explorer_no_influencers_found/explorer_no_influencers_found';
import { SwimlaneContainer } from './swimlane_container';
import { OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { NoOverallData } from './components/no_overall_data';

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
      services: {
        uiSettings,
        application: { capabilities },
      },
    } = useMlKibana();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAddDashboardsActive, setIsAddDashboardActive] = useState(false);

    const isSwimlaneSelectActive = useRef(false);
    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    const disableDragSelectOnMouseLeave = useRef(true);

    const canEditDashboards = capabilities.dashboard?.createNew ?? false;

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
            let target = e.target as HTMLElement;
            while (target && target !== document.body && !target.classList.contains('sl-cell')) {
              target = target.parentNode as HTMLElement;
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
      viewByLoadedForTimeFormatted,
      viewBySwimlaneData,
      viewBySwimlaneDataLoading,
      viewBySwimlaneFieldName,
      viewBySwimlaneOptions,
      selectedJobs,
      viewByFromPage,
      viewByPerPage,
      swimlaneLimit,
      loading,
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
    const swimlaneCellClick = useCallback(
      (selectedCellsUpdate: any) => {
        // If selectedCells is an empty object we clear any existing selection,
        // otherwise we save the new selection in AppState and update the Explorer.
        if (Object.keys(selectedCellsUpdate).length === 0) {
          setSelectedCells();
        } else {
          setSelectedCells(selectedCellsUpdate);
        }
      },
      [setSelectedCells]
    );

    const menuItems = useMemo(() => {
      const items = [];
      if (canEditDashboards) {
        items.push(
          <EuiContextMenuItem
            key="addToDashboard"
            onClick={setIsAddDashboardActive.bind(null, true)}
            data-test-subj="mlAnomalyTimelinePanelAddToDashboardButton"
          >
            <FormattedMessage
              id="xpack.ml.explorer.addToDashboardLabel"
              defaultMessage="Add to dashboard"
            />
          </EuiContextMenuItem>
        );
      }
      return items;
    }, [canEditDashboards]);

    return (
      <>
        <EuiPanel paddingSize="m">
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
                <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
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
                </EuiFlexItem>
              </>
            )}

            {menuItems.length > 0 && (
              <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      size="s"
                      aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                        defaultMessage: 'Actions',
                      })}
                      color="subdued"
                      iconType="boxesHorizontal"
                      onClick={setIsMenuOpen.bind(null, !isMenuOpen)}
                      data-test-subj="mlAnomalyTimelinePanelMenu"
                    />
                  }
                  isOpen={isMenuOpen}
                  closePopover={setIsMenuOpen.bind(null, false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel items={menuItems} />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <div
            className="mlExplorerSwimlane euiText"
            onMouseEnter={onSwimlaneEnterHandler}
            onMouseLeave={onSwimlaneLeaveHandler}
            data-test-subj="mlAnomalyExplorerSwimlaneOverall"
          >
            <SwimlaneContainer
              filterActive={filterActive}
              maskAll={maskAll}
              timeBuckets={timeBuckets}
              swimlaneCellClick={swimlaneCellClick}
              swimlaneData={overallSwimlaneData as OverallSwimlaneData}
              swimlaneType={'overall'}
              selection={selectedCells}
              swimlaneRenderDoneListener={swimlaneRenderDoneListener}
              onResize={(width) => explorerService.setSwimlaneContainerWidth(width)}
              isLoading={loading}
              noDataWarning={<NoOverallData />}
            />
          </div>

          <EuiSpacer size="m" />

          {viewBySwimlaneOptions.length > 0 && (
            <>
              <>
                <div
                  className="mlExplorerSwimlane euiText"
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
                    swimlaneData={viewBySwimlaneData as ViewBySwimLaneData}
                    swimlaneType={SWIMLANE_TYPE.VIEW_BY}
                    selection={selectedCells}
                    swimlaneRenderDoneListener={swimlaneRenderDoneListener}
                    onResize={(width) => explorerService.setSwimlaneContainerWidth(width)}
                    fromPage={viewByFromPage}
                    perPage={viewByPerPage}
                    swimlaneLimit={swimlaneLimit}
                    onPaginationChange={({ perPage: perPageUpdate, fromPage: fromPageUpdate }) => {
                      if (perPageUpdate) {
                        explorerService.setViewByPerPage(perPageUpdate);
                      }
                      if (fromPageUpdate) {
                        explorerService.setViewByFromPage(fromPageUpdate);
                      }
                    }}
                    isLoading={loading || viewBySwimlaneDataLoading}
                    noDataWarning={
                      typeof viewBySwimlaneFieldName === 'string' ? (
                        viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL ? (
                          <FormattedMessage
                            id="xpack.ml.explorer.noResultForSelectedJobsMessage"
                            defaultMessage="No results found for selected {jobsCount, plural, one {job} other {jobs}}"
                            values={{ jobsCount: selectedJobs?.length ?? 1 }}
                          />
                        ) : (
                          <ExplorerNoInfluencersFound
                            viewBySwimlaneFieldName={viewBySwimlaneFieldName}
                            showFilterMessage={filterActive === true}
                          />
                        )
                      ) : null
                    }
                  />
                </div>
              </>
            </>
          )}
        </EuiPanel>
        {isAddDashboardsActive && selectedJobs && (
          <AddToDashboardControl
            onClose={async (callback) => {
              setIsAddDashboardActive(false);
              if (callback) {
                await callback();
              }
            }}
            jobIds={selectedJobs.map(({ id }) => id)}
            viewBy={viewBySwimlaneFieldName!}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps.explorerState, nextProps.explorerState);
  }
);
