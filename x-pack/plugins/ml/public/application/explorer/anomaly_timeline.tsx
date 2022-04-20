/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import useObservable from 'react-use/lib/useObservable';
import { OVERALL_LABEL, SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from './explorer_constants';
import { AddSwimlaneToDashboardControl } from './dashboard_controls/add_swimlane_to_dashboard_controls';
import { useMlKibana } from '../contexts/kibana';
import { ExplorerState } from './reducers/explorer_reducer';
import { ExplorerNoInfluencersFound } from './components/explorer_no_influencers_found/explorer_no_influencers_found';
import { SwimlaneContainer } from './swimlane_container';
import { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { NoOverallData } from './components/no_overall_data';
import { SeverityControl } from '../components/severity_control';
import { AnomalyTimelineHelpPopover } from './anomaly_timeline_help_popover';
import { isDefined } from '../../../common/types/guards';
import { MlTooltipComponent } from '../components/chart_tooltip';
import { SwimlaneAnnotationContainer } from './swimlane_annotation_container';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';
import { useTimeBuckets } from '../components/custom_hooks/use_time_buckets';
import { formatHumanReadableDateTime } from '../../../common/util/date_utils';
import { getTimeBoundsFromSelection } from './hooks/use_selected_cells';

function mapSwimlaneOptionsToEuiOptions(options: string[]) {
  return options.map((option) => ({
    value: option,
    text: option,
  }));
}

interface AnomalyTimelineProps {
  explorerState: ExplorerState;
}

export const AnomalyTimeline: FC<AnomalyTimelineProps> = React.memo(
  ({ explorerState }) => {
    const {
      services: {
        application: { capabilities },
      },
    } = useMlKibana();

    const { anomalyExplorerCommonStateService, anomalyTimelineStateService } =
      useAnomalyExplorerContext();

    const setSelectedCells = anomalyTimelineStateService.setSelectedCells.bind(
      anomalyTimelineStateService
    );

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAddDashboardsActive, setIsAddDashboardActive] = useState(false);

    const canEditDashboards = capabilities.dashboard?.createNew ?? false;

    const timeBuckets = useTimeBuckets();

    const { overallAnnotations } = explorerState;

    const { filterActive } = useObservable(
      anomalyExplorerCommonStateService.getFilterSettings$(),
      anomalyExplorerCommonStateService.getFilterSettings()
    );

    const swimlaneLimit = useObservable(anomalyTimelineStateService.getSwimLaneCardinality$());

    const selectedJobs = useObservable(anomalyExplorerCommonStateService.getSelectedJobs$());

    const loading = useObservable(anomalyTimelineStateService.isOverallSwimLaneLoading$(), true);

    const swimlaneContainerWidth = useObservable(
      anomalyTimelineStateService.getContainerWidth$(),
      anomalyTimelineStateService.getContainerWidth()
    );
    const viewBySwimlaneDataLoading = useObservable(
      anomalyTimelineStateService.isViewBySwimLaneLoading$(),
      true
    );

    const overallSwimlaneData = useObservable(
      anomalyTimelineStateService.getOverallSwimLaneData$()
    );

    const viewBySwimlaneData = useObservable(anomalyTimelineStateService.getViewBySwimLaneData$());
    const selectedCells = useObservable(
      anomalyTimelineStateService.getSelectedCells$(),
      anomalyTimelineStateService.getSelectedCells()
    );
    const swimLaneSeverity = useObservable(anomalyTimelineStateService.getSwimLaneSeverity$());
    const viewBySwimlaneFieldName = useObservable(
      anomalyTimelineStateService.getViewBySwimlaneFieldName$()
    );

    const viewBySwimlaneOptions = useObservable(
      anomalyTimelineStateService.getViewBySwimLaneOptions$(),
      anomalyTimelineStateService.getViewBySwimLaneOptions()
    );

    const { viewByPerPage, viewByFromPage } = useObservable(
      anomalyTimelineStateService.getSwimLanePagination$(),
      anomalyTimelineStateService.getSwimLanePagination()
    );

    const [severityUpdate, setSeverityUpdate] = useState(
      anomalyTimelineStateService.getSwimLaneSeverity()
    );

    const timeRange = getTimeBoundsFromSelection(selectedCells);

    const viewByLoadedForTimeFormatted = timeRange
      ? `${formatHumanReadableDateTime(timeRange.earliestMs)} - ${formatHumanReadableDateTime(
          timeRange.latestMs
        )}`
      : null;

    useDebounce(
      () => {
        if (severityUpdate === swimLaneSeverity) return;
        anomalyTimelineStateService.setSeverity(severityUpdate!);
      },
      500,
      [severityUpdate, swimLaneSeverity]
    );

    const annotations = useMemo(() => overallAnnotations.annotationsData, [overallAnnotations]);

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

    // If selecting a cell in the 'view by' swimlane, indicate the corresponding time in the Overall swimlane.
    const overallCellSelection: AppStateSelectedCells | undefined = useMemo(() => {
      if (!selectedCells) return;

      if (selectedCells.type === SWIMLANE_TYPE.OVERALL) return selectedCells;

      return {
        type: SWIMLANE_TYPE.OVERALL,
        lanes: [OVERALL_LABEL],
        times: selectedCells.times,
      };
    }, [selectedCells]);

    const annotationXDomain = useMemo(
      () =>
        AnomalyTimelineService.isOverallSwimlaneData(overallSwimlaneData)
          ? {
              min: overallSwimlaneData.earliest * 1000,
              max: overallSwimlaneData.latest * 1000,
              minInterval: overallSwimlaneData.interval * 1000,
            }
          : undefined,
      [overallSwimlaneData]
    );

    const onResize = useCallback((value: number) => {
      anomalyTimelineStateService.setContainerWidth(value);
    }, []);

    return (
      <>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiFlexGroup direction="row" gutterSize="xs" responsive={false} alignItems="baseline">
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

            <EuiFlexItem grow={false}>
              <AnomalyTimelineHelpPopover />
            </EuiFlexItem>

            {menuItems.length > 0 && (
              <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      size="s"
                      aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                        defaultMessage: 'Actions',
                      })}
                      color="text"
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

          <EuiFlexGroup direction="row" gutterSize="m" responsive={false} alignItems="baseline">
            {viewBySwimlaneOptions.length > 0 && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    prepend={i18n.translate('xpack.ml.explorer.viewByLabel', {
                      defaultMessage: 'View by',
                    })}
                    compressed
                    id="selectViewBy"
                    options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                    value={viewBySwimlaneFieldName}
                    onChange={(e) => {
                      anomalyTimelineStateService.setViewBySwimLaneFieldName(e.target.value);
                    }}
                  />
                </EuiFlexItem>
              </>
            )}

            <EuiFlexItem grow={true}>
              <SeverityControl
                value={severityUpdate ?? 0}
                onChange={useCallback((update) => {
                  setSeverityUpdate(update);
                }, [])}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup direction="row" gutterSize="m" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <div className="panel-sub-title">
                {viewByLoadedForTimeFormatted && (
                  <FormattedMessage
                    id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                    defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                    values={{ viewByLoadedForTimeFormatted }}
                  />
                )}
                {isDefined(viewByLoadedForTimeFormatted) ? null : (
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
            <EuiFlexItem grow={false} style={{ visibility: selectedCells ? 'visible' : 'hidden' }}>
              <EuiButtonEmpty
                size="xs"
                onClick={setSelectedCells.bind(anomalyTimelineStateService, undefined)}
                data-test-subj="mlAnomalyTimelineClearSelection"
              >
                <FormattedMessage
                  id="xpack.ml.explorer.clearSelectionLabel"
                  defaultMessage="Clear selection"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
          {annotationXDomain && Array.isArray(annotations) && annotations.length > 0 ? (
            <>
              <MlTooltipComponent>
                {(tooltipService) => (
                  <SwimlaneAnnotationContainer
                    chartWidth={swimlaneContainerWidth!}
                    domain={annotationXDomain}
                    annotationsData={annotations}
                    tooltipService={tooltipService}
                  />
                )}
              </MlTooltipComponent>
              <EuiSpacer size="m" />
            </>
          ) : null}

          <SwimlaneContainer
            id="overall"
            data-test-subj="mlAnomalyExplorerSwimlaneOverall"
            filterActive={filterActive}
            timeBuckets={timeBuckets}
            swimlaneData={overallSwimlaneData as OverallSwimlaneData}
            swimlaneType={SWIMLANE_TYPE.OVERALL}
            selection={overallCellSelection}
            onCellsSelection={setSelectedCells}
            onResize={onResize}
            isLoading={loading}
            noDataWarning={
              <EuiText textAlign={'center'}>
                <h5>
                  <NoOverallData />
                </h5>
              </EuiText>
            }
            showTimeline={false}
            showLegend={false}
          />

          <EuiSpacer size="m" />
          {viewBySwimlaneOptions.length > 0 && (
            <SwimlaneContainer
              id="view_by"
              data-test-subj="mlAnomalyExplorerSwimlaneViewBy"
              filterActive={filterActive}
              timeBuckets={timeBuckets}
              showLegend={false}
              swimlaneData={viewBySwimlaneData as ViewBySwimLaneData}
              swimlaneType={SWIMLANE_TYPE.VIEW_BY}
              selection={selectedCells}
              onCellsSelection={setSelectedCells}
              onResize={onResize}
              fromPage={viewByFromPage}
              perPage={viewByPerPage}
              swimlaneLimit={swimlaneLimit}
              onPaginationChange={({ perPage: perPageUpdate, fromPage: fromPageUpdate }) => {
                if (perPageUpdate) {
                  anomalyTimelineStateService.setSwimLanePagination({
                    viewByPerPage: perPageUpdate,
                  });
                }
                if (fromPageUpdate) {
                  anomalyTimelineStateService.setSwimLanePagination({
                    viewByFromPage: fromPageUpdate,
                  });
                }
              }}
              isLoading={loading || viewBySwimlaneDataLoading}
              noDataWarning={
                <EuiText textAlign={'center'}>
                  <h5>
                    {typeof viewBySwimlaneFieldName === 'string' ? (
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
                    ) : null}
                  </h5>
                </EuiText>
              }
            />
          )}
        </EuiPanel>
        {isAddDashboardsActive && selectedJobs && (
          <AddSwimlaneToDashboardControl
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
