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
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
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
import type { Query } from '@kbn/es-query';
import { isDefined } from '@kbn/ml-is-defined';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { SEARCH_QUERY_LANGUAGE } from '../../../common/constants/search';
import { useCasesModal } from '../contexts/kibana/use_cases_modal';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../..';
import {
  OVERALL_LABEL,
  SWIMLANE_TYPE,
  SwimlaneType,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import { AddSwimlaneToDashboardControl } from './dashboard_controls/add_swimlane_to_dashboard_controls';
import { useMlKibana } from '../contexts/kibana';
import { ExplorerState } from './reducers/explorer_reducer';
import { ExplorerNoInfluencersFound } from './components/explorer_no_influencers_found';
import { SwimlaneContainer } from './swimlane_container';
import { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { NoOverallData } from './components/no_overall_data';
import { SeverityControl } from '../components/severity_control';
import { AnomalyTimelineHelpPopover } from './anomaly_timeline_help_popover';
import { MlTooltipComponent } from '../components/chart_tooltip';
import { SwimlaneAnnotationContainer, Y_AXIS_LABEL_WIDTH } from './swimlane_annotation_container';
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
        charts: chartsService,
        cases,
      },
    } = useMlKibana();

    const globalTimeRange = useTimeRangeUpdates(true);

    const selectCaseModal = cases?.hooks.getUseCasesAddToExistingCaseModal();

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

    const { filterActive, queryString } = useObservable(
      anomalyExplorerCommonStateService.getFilterSettings$(),
      anomalyExplorerCommonStateService.getFilterSettings()
    );

    const swimlaneLimit = useObservable(anomalyTimelineStateService.getSwimLaneCardinality$());

    const selectedJobs = useObservable(
      anomalyExplorerCommonStateService.getSelectedJobs$(),
      anomalyExplorerCommonStateService.getSelectedJobs()
    );

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

    const openCasesModalCallback = useCasesModal(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE);

    const openCasesModal = useCallback(
      (swimLaneType: SwimlaneType) => {
        openCasesModalCallback({
          swimlaneType: swimLaneType,
          ...(swimLaneType === SWIMLANE_TYPE.VIEW_BY ? { viewBy: viewBySwimlaneFieldName } : {}),
          jobIds: selectedJobs?.map((v) => v.id),
          timeRange: globalTimeRange,
          ...(isDefined(queryString) && queryString !== ''
            ? {
                query: {
                  query: queryString,
                  language: SEARCH_QUERY_LANGUAGE.KUERY,
                } as Query,
              }
            : {}),
        });
      },
      [openCasesModalCallback, selectedJobs, globalTimeRange, viewBySwimlaneFieldName, queryString]
    );

    const annotations = useMemo(() => overallAnnotations.annotationsData, [overallAnnotations]);

    const closePopoverOnAction = useCallback(
      (actionCallback: Function) => {
        return () => {
          setIsMenuOpen(false);
          actionCallback();
        };
      },
      [setIsMenuOpen]
    );

    const menuPanels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
      const rootItems: EuiContextMenuPanelItemDescriptor[] = [];
      const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items: rootItems }];

      if (canEditDashboards) {
        rootItems.push({
          name: (
            <FormattedMessage
              id="xpack.ml.explorer.addToDashboardLabel"
              defaultMessage="Add to dashboard"
            />
          ),
          onClick: closePopoverOnAction(setIsAddDashboardActive.bind(null, true)),
          'data-test-subj': 'mlAnomalyTimelinePanelAddToDashboardButton',
        });
      }

      const casesPrivileges = cases?.helpers.canUseCases();

      if ((!!casesPrivileges?.create || !!casesPrivileges?.update) && selectCaseModal) {
        rootItems.push({
          panel: 1,
          name: (
            <FormattedMessage
              id="xpack.ml.explorer.attachToCaseLabel"
              defaultMessage="Add to case"
            />
          ),
          'data-test-subj': 'mlAnomalyTimelinePanelAttachToCaseButton',
        });

        panels.push({
          id: 1,
          initialFocusedItemIndex: 0,
          title: (
            <FormattedMessage
              id="xpack.ml.explorer.attachToCaseLabel"
              defaultMessage="Add to case"
            />
          ),
          items: [
            {
              name: (
                <FormattedMessage
                  id="xpack.ml.explorer.attachOverallSwimLane"
                  defaultMessage="Overall"
                />
              ),
              onClick: closePopoverOnAction(openCasesModal.bind(null, 'overall')),
              'data-test-subj': 'mlAnomalyTimelinePanelAttachOverallButton',
            },
            {
              name: (
                <FormattedMessage
                  id="xpack.ml.explorer.attachViewBySwimLane"
                  defaultMessage="View by {viewByField}"
                  values={{ viewByField: viewBySwimlaneFieldName }}
                />
              ),
              onClick: closePopoverOnAction(openCasesModal.bind(null, 'viewBy')),
              'data-test-subj': 'mlAnomalyTimelinePanelAttachViewByButton',
            },
          ],
        });
      }

      return panels;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canEditDashboards, openCasesModal, viewBySwimlaneFieldName]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiFlexGroup direction="row" gutterSize="xs" responsive={false} alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiTitle size={'xs'}>
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

            {menuPanels[0].items!.length > 0 ? (
              <EuiFlexItem
                grow={false}
                css={{ 'margin-left': 'auto !important', 'align-self': 'baseline' }}
              >
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
                  <EuiContextMenu initialPanelId={0} panels={menuPanels} />
                </EuiPopover>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>

          <EuiSpacer size="s" />

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

            <EuiFlexItem grow={true} css={{ 'max-width': '500px' }}>
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
              <EuiText size={'xs'} color={'subdued'}>
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
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ visibility: selectedCells ? 'visible' : 'hidden' }}>
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
            yAxisWidth={Y_AXIS_LABEL_WIDTH}
            chartsService={chartsService}
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
              chartsService={chartsService}
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
              yAxisWidth={Y_AXIS_LABEL_WIDTH}
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
            queryString={queryString}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps.explorerState, nextProps.explorerState);
  }
);
