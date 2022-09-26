/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  htmlIdGenerator,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiTitle,
  EuiLoadingContent,
  EuiPanel,
  EuiAccordion,
  EuiBadge,
  EuiResizableContainer,
  useIsWithinBreakpoints,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { HelpPopover } from '../components/help_popover';
import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
// @ts-ignore
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { ExplorerNoJobsSelected, ExplorerNoResultsFound } from './components';
import { InfluencersList } from '../components/influencers_list';
import { CheckboxShowCharts } from '../components/controls/checkbox_showcharts';
import { JobSelector } from '../components/job_selector';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import {
  ExplorerQueryBar,
  getKqlQueryValues,
  DEFAULT_QUERY_LANG,
} from './components/explorer_query_bar/explorer_query_bar';
import {
  getDateFormatTz,
  removeFilterFromQueryString,
  getQueryPattern,
  escapeParens,
  escapeDoubleQuotes,
  OverallSwimlaneData,
  AppStateSelectedCells,
  getSourceIndicesWithGeoFields,
  SourceIndicesWithGeoFields,
} from './explorer_utils';
import { AnomalyTimeline } from './anomaly_timeline';
import { FILTER_ACTION, FilterAction } from './explorer_constants';
// Explorer Charts
// @ts-ignore
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';
// Anomalies Table
// @ts-ignore
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
// Anomalies Map
import { AnomaliesMap } from './anomalies_map';
import { ANOMALY_DETECTION_DEFAULT_TIME_RANGE } from '../../../common/constants/settings';
import { AnomalyContextMenu } from './anomaly_context_menu';
import { isDefined } from '../../../common/types/guards';
import type { JobSelectorProps } from '../components/job_selector/job_selector';
import type { ExplorerState } from './reducers';
import type { TimeBuckets } from '../util/time_buckets';
import { useToastNotificationService } from '../services/toast_notification_service';
import { useMlKibana, useMlLocator } from '../contexts/kibana';
import { useMlContext } from '../contexts/ml';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';
import { ML_ANOMALY_EXPLORER_PANELS } from '../../../common/types/storage';
import { useStorage } from '../contexts/ml/use_storage';

interface ExplorerPageProps {
  jobSelectorProps: JobSelectorProps;
  noInfluencersConfigured?: boolean;
  influencers?: ExplorerState['influencers'];
  filterActive?: boolean;
  filterPlaceHolder?: string;
  indexPattern?: DataView;
  queryString?: string;
  updateLanguage?: (language: string) => void;
}

const ExplorerPage: FC<ExplorerPageProps> = ({
  children,
  jobSelectorProps,
  noInfluencersConfigured,
  influencers,
  filterActive,
  filterPlaceHolder,
  indexPattern,
  queryString,
  updateLanguage,
}) => (
  <>
    <EuiPageHeader>
      <EuiPageHeaderSection style={{ width: '100%' }}>
        <JobSelector {...jobSelectorProps} />

        {indexPattern && updateLanguage ? (
          <>
            <ExplorerQueryBar
              filterActive={!!filterActive}
              filterPlaceHolder={filterPlaceHolder}
              indexPattern={indexPattern}
              queryString={queryString}
              updateLanguage={updateLanguage}
            />
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </>
        ) : null}
      </EuiPageHeaderSection>
    </EuiPageHeader>
    {children}
  </>
);

interface ExplorerUIProps {
  explorerState: ExplorerState;
  severity: number;
  showCharts: boolean;
  selectedJobsRunning: boolean;
  overallSwimlaneData: OverallSwimlaneData | null;
  invalidTimeRangeError?: boolean;
  stoppedPartitions?: string[];
  // TODO Remove
  timefilter: TimefilterContract;
  // TODO Remove
  timeBuckets: TimeBuckets;
  selectedCells: AppStateSelectedCells | undefined | null;
  swimLaneSeverity?: number;
}

export function getDefaultPanelsState() {
  return {
    topInfluencers: {
      isCollapsed: false,
      size: 20,
    },
    mainPage: {
      isCollapsed: false,
      size: 80,
    },
  };
}

export const Explorer: FC<ExplorerUIProps> = ({
  invalidTimeRangeError,
  showCharts,
  severity,
  stoppedPartitions,
  selectedJobsRunning,
  timefilter,
  timeBuckets,
  selectedCells,
  swimLaneSeverity,
  explorerState,
  overallSwimlaneData,
}) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const [anomalyExplorerPanelState, setAnomalyExplorerPanelState] = useStorage(
    ML_ANOMALY_EXPLORER_PANELS,
    {
      topInfluencers: {
        isCollapsed: false,
        size: 20,
      },
      mainPage: {
        size: 80,
      },
    }
  );

  const topInfluencersPanelRef = useRef<HTMLDivElement | null>(null);

  const collapseFn = useRef<() => void | undefined>();
  const panelsInitialized = useRef<boolean>(false);

  useEffect(
    /**
     * Preserve collapsible panel state on page load.
     * TODO Remove when https://github.com/elastic/eui/issues/4736 is resolved.
     */
    function initTopInfluencersPanelCollapse() {
      if (panelsInitialized.current || !collapseFn.current || !topInfluencersPanelRef.current)
        return;

      panelsInitialized.current = true;

      if (anomalyExplorerPanelState.topInfluencers.isCollapsed) {
        setTimeout(() => {
          if (collapseFn.current) {
            collapseFn.current();
          }
        }, 0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      collapseFn.current,
      panelsInitialized,
      topInfluencersPanelRef.current,
      anomalyExplorerPanelState,
    ]
  );

  const onPanelWidthChange = useCallback(
    (newSizes) => {
      setAnomalyExplorerPanelState({
        mainPage: {
          size: newSizes.mainPage,
        },
        topInfluencers: {
          ...anomalyExplorerPanelState.topInfluencers,
          size: newSizes.topInfluencers,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anomalyExplorerPanelState]
  );

  const onToggleCollapsed = useCallback(() => {
    panelsInitialized.current = true;

    const isCurrentlyCollapsed = anomalyExplorerPanelState.topInfluencers.isCollapsed;

    if (isCurrentlyCollapsed) {
      setAnomalyExplorerPanelState({
        mainPage: {
          size: 80,
        },
        topInfluencers: {
          size: 20,
          isCollapsed: !isCurrentlyCollapsed,
        },
      });
      return;
    }

    setAnomalyExplorerPanelState({
      mainPage: anomalyExplorerPanelState.mainPage,
      topInfluencers: {
        ...anomalyExplorerPanelState.topInfluencers,
        isCollapsed: !isCurrentlyCollapsed,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomalyExplorerPanelState]);

  const { displayWarningToast, displayDangerToast } = useToastNotificationService();
  const { anomalyTimelineStateService, anomalyExplorerCommonStateService, chartsStateService } =
    useAnomalyExplorerContext();

  const htmlIdGen = useMemo(() => htmlIdGenerator(), []);

  const [language, updateLanguage] = useState<string>(DEFAULT_QUERY_LANG);
  const [sourceIndicesWithGeoFields, setSourceIndicesWithGeoFields] =
    useState<SourceIndicesWithGeoFields>({});

  const filterSettings = useObservable(
    anomalyExplorerCommonStateService.getFilterSettings$(),
    anomalyExplorerCommonStateService.getFilterSettings()
  );

  const selectedJobs = useObservable(
    anomalyExplorerCommonStateService.getSelectedJobs$(),
    anomalyExplorerCommonStateService.getSelectedJobs()
  );

  const applyFilter = useCallback(
    (fieldName: string, fieldValue: string, action: FilterAction) => {
      const { filterActive, queryString } = filterSettings;

      const indexPattern = explorerState.indexPattern;

      let newQueryString = '';
      const operator = 'and ';
      const sanitizedFieldName = escapeParens(fieldName);
      const sanitizedFieldValue = escapeDoubleQuotes(fieldValue);

      if (action === FILTER_ACTION.ADD) {
        // Don't re-add if already exists in the query
        const queryPattern = getQueryPattern(fieldName, fieldValue);
        if (queryString.match(queryPattern) !== null) {
          return;
        }
        newQueryString = `${
          queryString ? `${queryString} ${operator}` : ''
        }${sanitizedFieldName}:"${sanitizedFieldValue}"`;
      } else if (action === FILTER_ACTION.REMOVE) {
        if (filterActive === false) {
          return;
        } else {
          newQueryString = removeFilterFromQueryString(
            queryString,
            sanitizedFieldName,
            sanitizedFieldValue
          );
        }
      }

      try {
        const { clearSettings, settings } = getKqlQueryValues({
          inputString: `${newQueryString}`,
          queryLanguage: language,
          indexPattern: indexPattern as DataView,
        });

        if (clearSettings === true) {
          anomalyExplorerCommonStateService.clearFilterSettings();
        } else {
          anomalyExplorerCommonStateService.setFilterSettings(settings);
        }
      } catch (e) {
        console.log('Invalid query syntax from table', e); // eslint-disable-line no-console

        displayDangerToast(
          i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessageFromTable', {
            defaultMessage:
              'Invalid syntax in query bar. The input must be valid Kibana Query Language (KQL)',
          })
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [explorerState, language, filterSettings]
  );

  useEffect(() => {
    if (invalidTimeRangeError) {
      displayWarningToast(
        i18n.translate('xpack.ml.explorer.invalidTimeRangeInUrlCallout', {
          defaultMessage:
            'The time filter was changed to the full range due to an invalid default time filter. Check the advanced settings for {field}.',
          values: {
            field: ANOMALY_DETECTION_DEFAULT_TIME_RANGE,
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    services: { charts: chartsService },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const mlLocator = useMlLocator();
  const context = useMlContext();
  const dataViewsService = context.dataViewsContract;

  const {
    annotations,
    filterPlaceHolder,
    indexPattern,
    influencers,
    loading,
    noInfluencersConfigured,
    tableData,
  } = explorerState;

  const chartsData = useObservable(
    chartsStateService.getChartsData$(),
    chartsStateService.getChartsData()
  );

  const { filterActive, queryString } = filterSettings;

  const isOverallSwimLaneLoading = useObservable(
    anomalyTimelineStateService.isOverallSwimLaneLoading$(),
    true
  );
  const isViewBySwimLaneLoading = useObservable(
    anomalyTimelineStateService.isViewBySwimLaneLoading$(),
    true
  );

  const isDataLoading = loading || isOverallSwimLaneLoading || isViewBySwimLaneLoading;

  const swimLaneBucketInterval = useObservable(
    anomalyTimelineStateService.getSwimLaneBucketInterval$(),
    anomalyTimelineStateService.getSwimLaneBucketInterval()
  );

  const { annotationsData, totalCount: allAnnotationsCnt, error: annotationsError } = annotations;

  const annotationsCnt = Array.isArray(annotationsData) ? annotationsData.length : 0;
  const badge =
    (allAnnotationsCnt ?? 0) > annotationsCnt ? (
      <EuiBadge color={'hollow'}>
        <FormattedMessage
          id="xpack.ml.explorer.annotationsOutOfTotalCountTitle"
          defaultMessage="First {visibleCount} out of a total of {totalCount}"
          values={{ visibleCount: annotationsCnt, totalCount: allAnnotationsCnt }}
        />
      </EuiBadge>
    ) : (
      <EuiBadge color={'hollow'}>
        <FormattedMessage
          id="xpack.ml.explorer.annotationsTitleTotalCount"
          defaultMessage="Total: {count}"
          values={{ count: annotationsCnt }}
        />
      </EuiBadge>
    );

  const jobSelectorProps = {
    dateFormatTz: getDateFormatTz(),
  } as JobSelectorProps;

  const noJobsSelected = !selectedJobs || selectedJobs.length === 0;
  const hasResults: boolean =
    !!overallSwimlaneData?.points && overallSwimlaneData.points.length > 0;
  const hasResultsWithAnomalies =
    (hasResults && overallSwimlaneData!.points.some((v) => v.value > 0)) ||
    tableData.anomalies?.length > 0;

  const hasActiveFilter = isDefined(swimLaneSeverity);
  const selectedJobIds = Array.isArray(selectedJobs) ? selectedJobs.map((job) => job.id) : [];

  useEffect(() => {
    if (!noJobsSelected) {
      getSourceIndicesWithGeoFields(selectedJobs, dataViewsService)
        .then((sourceIndicesWithGeoFieldsMap) =>
          setSourceIndicesWithGeoFields(sourceIndicesWithGeoFieldsMap)
        )
        .catch(console.error); // eslint-disable-line no-console
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedJobIds)]);

  if (noJobsSelected && !loading) {
    return (
      <ExplorerPage jobSelectorProps={jobSelectorProps}>
        <ExplorerNoJobsSelected />
      </ExplorerPage>
    );
  }

  if (!hasResultsWithAnomalies && !isDataLoading && !hasActiveFilter) {
    return (
      <ExplorerPage jobSelectorProps={jobSelectorProps}>
        <ExplorerNoResultsFound hasResults={hasResults} selectedJobsRunning={selectedJobsRunning} />
      </ExplorerPage>
    );
  }

  const bounds = timefilter.getActiveBounds();

  const mainPanelContent = (
    <div>
      {stoppedPartitions && (
        <EuiCallOut
          size={'s'}
          title={
            <FormattedMessage
              id="xpack.ml.explorer.stoppedPartitionsExistCallout"
              defaultMessage="There may be fewer results than there could have been because stop_on_warn is turned on. Both categorization and subsequent anomaly detection have stopped for some partitions in {jobsWithStoppedPartitions, plural, one {job} other {jobs}} [{stoppedPartitions}] where the categorization status has changed to warn."
              values={{
                jobsWithStoppedPartitions: stoppedPartitions.length,
                stoppedPartitions: stoppedPartitions.join(', '),
              }}
            />
          }
        />
      )}

      <AnomalyTimeline explorerState={explorerState} />

      <EuiSpacer size="m" />

      {annotationsError !== undefined && (
        <>
          <EuiTitle data-test-subj="mlAnomalyExplorerAnnotationsPanel error" size={'xs'}>
            <h2>
              <FormattedMessage
                id="xpack.ml.explorer.annotationsErrorTitle"
                defaultMessage="Annotations"
              />
            </h2>
          </EuiTitle>
          <EuiPanel>
            <EuiCallOut
              title={i18n.translate('xpack.ml.explorer.annotationsErrorCallOutTitle', {
                defaultMessage: 'An error occurred loading annotations:',
              })}
              color="danger"
              iconType="alert"
            >
              <p>{annotationsError}</p>
            </EuiCallOut>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}
      {loading === false && tableData.anomalies?.length ? (
        <AnomaliesMap anomalies={tableData.anomalies} jobIds={selectedJobIds} />
      ) : null}
      {annotationsCnt > 0 && (
        <>
          <EuiPanel
            data-test-subj="mlAnomalyExplorerAnnotationsPanel loaded"
            hasBorder
            hasShadow={false}
          >
            <EuiAccordion
              id={htmlIdGen()}
              buttonContent={
                <EuiTitle data-test-subj="mlAnomalyExplorerAnnotationsPanelButton" size={'xs'}>
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.explorer.annotationsTitle"
                      defaultMessage="Annotations {badge}"
                      values={{
                        badge,
                      }}
                    />
                  </h2>
                </EuiTitle>
              }
            >
              <>
                <EuiSpacer size={'m'} />
                <AnnotationsTable
                  jobIds={selectedJobIds}
                  annotations={annotationsData}
                  drillDown={true}
                  numberBadge={false}
                />
              </>
            </EuiAccordion>
          </EuiPanel>
          <AnnotationFlyout />
          <EuiSpacer size="m" />
        </>
      )}
      {loading === false && (
        <EuiPanel hasBorder hasShadow={false}>
          <EuiFlexGroup direction="row" gutterSize="m" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size={'xs'}>
                <h2>
                  <FormattedMessage
                    id="xpack.ml.explorer.anomaliesTitle"
                    defaultMessage="Anomalies"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
              <AnomalyContextMenu
                selectedJobs={selectedJobs!}
                selectedCells={selectedCells}
                bounds={bounds}
                interval={swimLaneBucketInterval ? swimLaneBucketInterval.asSeconds() : undefined}
                chartsCount={chartsData.seriesToPlot.length}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup direction="row" gutterSize="l" responsive={true} alignItems="center">
            <EuiFlexItem grow={false}>
              <SelectSeverity />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SelectInterval />
            </EuiFlexItem>
            {chartsData.seriesToPlot.length > 0 && selectedCells !== undefined && (
              <EuiFlexItem grow={false}>
                <CheckboxShowCharts />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {showCharts ? (
            <ExplorerChartsContainer
              {...{
                ...chartsData,
                severity,
                timefilter,
                mlLocator,
                timeBuckets,
                onSelectEntity: applyFilter,
                chartsService,
              }}
            />
          ) : null}

          <EuiSpacer size="m" />

          <AnomaliesTable
            bounds={bounds}
            tableData={tableData}
            influencerFilter={applyFilter}
            sourceIndicesWithGeoFields={sourceIndicesWithGeoFields}
          />
        </EuiPanel>
      )}
    </div>
  );

  return (
    <ExplorerPage
      jobSelectorProps={jobSelectorProps}
      noInfluencersConfigured={noInfluencersConfigured}
      influencers={influencers}
      filterActive={filterActive}
      filterPlaceHolder={filterPlaceHolder}
      indexPattern={indexPattern as DataView}
      queryString={queryString}
      updateLanguage={updateLanguage}
    >
      <EuiSpacer size={'m'} />

      {noInfluencersConfigured ? (
        <EuiFlexGroup gutterSize={'s'}>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.ml.explorer.noConfiguredInfluencersTooltip', {
                defaultMessage:
                  'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
              })}
              position="right"
              type="iInCircle"
            />
          </EuiFlexItem>
          <EuiFlexItem>{mainPanelContent}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <div>
          <EuiResizableContainer
            direction={isMobile ? 'vertical' : 'horizontal'}
            onPanelWidthChange={onPanelWidthChange}
          >
            {(EuiResizablePanel, EuiResizableButton, actions) => {
              collapseFn.current = () =>
                actions.togglePanel!('topInfluencers', { direction: 'left' });

              return (
                <>
                  <EuiResizablePanel
                    panelRef={topInfluencersPanelRef}
                    id={'topInfluencers'}
                    mode={[
                      'collapsible',
                      {
                        'data-test-subj': 'mlTopInfluencersToggle',
                        position: 'top',
                      },
                    ]}
                    minSize={'200px'}
                    initialSize={20}
                    paddingSize={'none'}
                    onToggleCollapsed={onToggleCollapsed}
                  >
                    <div
                      data-test-subj="mlAnomalyExplorerInfluencerList"
                      css={css`
                        padding: calc(${euiTheme.size.base} + ${euiTheme.border.width.thin})
                          ${euiTheme.size.l} ${euiTheme.size.l} 0;
                      `}
                    >
                      <EuiFlexGroup
                        direction="row"
                        gutterSize="xs"
                        responsive={false}
                        alignItems="baseline"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiTitle size={'xs'}>
                            <h2>
                              <FormattedMessage
                                id="xpack.ml.explorer.topInfuencersTitle"
                                defaultMessage="Top influencers"
                              />
                            </h2>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <HelpPopover
                            anchorPosition="upCenter"
                            title={i18n.translate('xpack.ml.explorer.topInfluencersPopoverTitle', {
                              defaultMessage: 'Top influencers',
                            })}
                          >
                            <p>
                              <FormattedMessage
                                id="xpack.ml.explorer.topInfluencersTooltip"
                                defaultMessage="View the relative impact of the top influencers in the selected time period and add them as filters on the results. Each influencer has a maximum anomaly score between 0-100 and a total anomaly score for that period."
                              />
                            </p>
                          </HelpPopover>
                        </EuiFlexItem>
                      </EuiFlexGroup>

                      <EuiSpacer size={'m'} />

                      {loading ? (
                        <EuiLoadingContent lines={10} />
                      ) : (
                        <InfluencersList influencers={influencers} influencerFilter={applyFilter} />
                      )}
                    </div>
                  </EuiResizablePanel>

                  <EuiResizableButton />

                  <EuiResizablePanel
                    id="mainPage"
                    mode="main"
                    minSize={'70%'}
                    initialSize={80}
                    paddingSize={'none'}
                  >
                    {mainPanelContent}
                  </EuiResizablePanel>
                </>
              );
            }}
          </EuiResizableContainer>
        </div>
      )}
    </ExplorerPage>
  );
};
