/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { OVERALL_LABEL, SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from './explorer_constants';
import { AddSwimlaneToDashboardControl } from './dashboard_controls/add_swimlane_to_dashboard_controls';
import { useMlKibana } from '../contexts/kibana';
import { TimeBuckets } from '../util/time_buckets';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { explorerService } from './explorer_dashboard_service';
import { ExplorerState } from './reducers/explorer_reducer';
import { hasMatchingPoints } from './has_matching_points';
import { ExplorerNoInfluencersFound } from './components/explorer_no_influencers_found/explorer_no_influencers_found';
import { SwimlaneContainer } from './swimlane_container';
import { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { NoOverallData } from './components/no_overall_data';
import { HelpPopover, HelpPopoverButton } from '../components/help_popover/help_popover';

const AnomalyTimelineHelpPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <HelpPopover
      anchorPosition="upCenter"
      button={
        <HelpPopoverButton
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        />
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.ml.explorer.anomalyTimelinePopoverTitle', {
        defaultMessage: 'Anomaly timelines',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.ml.explorer.anomalyTimelinePopoverBasicExplanation"
          defaultMessage="Swim lanes provide an overview of the buckets of data that have been analyzed within the selected time period. You can view an overall swim lane or view them by job or influencer."
         />
      </p>
      <p>
        {i18n.translate('xpack.ml.explorer.anomalyTimelinePopoverScoreExplanation', {
          defaultMessage:
            'Each block in a swim lane is colored according to its anomaly score, which is a value from 0 to 100. The blocks with high scores are shown in red and low scores are indicated in blue.',
        })}
      </p>
      <p>
        {i18n.translate('xpack.ml.explorer.anomalyTimelinePopoverAdvancedExplanation', {
          defaultMessage:
            'The anomaly scores that you see in each section of the Anomaly Explorer might differ slightly. This disparity occurs because for each job there are bucket results, overall bucket results, influencer results, and record results. Anomaly scores are generated for each type of result. The overall swim lane shows the maximum overall bucket score for each block. When you view a swim lane by job, it shows the maximum bucket score in each block. When you view by influencer, it shows the maximum influencer score in each block.',
        })}
      </p>
      <p>
        {i18n.translate('xpack.ml.explorer.anomalyTimelinePopoverSelectionExplanation', {
          defaultMessage:
            'When you select one or more blocks in the swim lanes, the list of anomalies and top influencers is likewise filtered to provide information relative to that selection.',
        })}
      </p>
    </HelpPopover>
  );
};

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

    const canEditDashboards = capabilities.dashboard?.createNew ?? false;

    const timeBuckets = useMemo(() => {
      return new TimeBuckets({
        'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
        'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
        dateFormat: uiSettings.get('dateFormat'),
        'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
      });
    }, [uiSettings]);

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
      overallAnnotations,
    } = explorerState;

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
                {selectedCells ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={setSelectedCells.bind(null, undefined)}
                      data-test-subj="mlAnomalyTimelineClearSelection"
                    >
                      <FormattedMessage
                        id="xpack.ml.explorer.clearSelectionLabel"
                        defaultMessage="Clear selection"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
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

            <EuiFlexItem grow={false}>
              <AnomalyTimelineHelpPopover />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <SwimlaneContainer
            id="overall"
            data-test-subj="mlAnomalyExplorerSwimlaneOverall"
            filterActive={filterActive}
            maskAll={maskAll}
            timeBuckets={timeBuckets}
            swimlaneData={overallSwimlaneData as OverallSwimlaneData}
            swimlaneType={SWIMLANE_TYPE.OVERALL}
            selection={overallCellSelection}
            onCellsSelection={setSelectedCells}
            onResize={explorerService.setSwimlaneContainerWidth}
            isLoading={loading}
            noDataWarning={<NoOverallData />}
            showTimeline={false}
            annotationsData={annotations}
          />

          <EuiSpacer size="m" />

          {viewBySwimlaneOptions.length > 0 && (
            <SwimlaneContainer
              id="view_by"
              data-test-subj="mlAnomalyExplorerSwimlaneViewBy"
              filterActive={filterActive}
              maskAll={
                maskAll &&
                !hasMatchingPoints({
                  filteredFields,
                  swimlaneData: viewBySwimlaneData,
                })
              }
              timeBuckets={timeBuckets}
              showLegend={true}
              swimlaneData={viewBySwimlaneData as ViewBySwimLaneData}
              swimlaneType={SWIMLANE_TYPE.VIEW_BY}
              selection={selectedCells}
              onCellsSelection={setSelectedCells}
              onResize={explorerService.setSwimlaneContainerWidth}
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
