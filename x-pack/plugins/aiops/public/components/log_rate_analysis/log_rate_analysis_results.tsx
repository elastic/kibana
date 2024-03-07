/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState, FC } from 'react';
import { isEqual, uniq } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/ml-response-stream/client';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
  type WindowParameters,
} from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis/schema';
import type { AiopsLogRateAnalysisSchemaSignificantItem } from '../../../common/api/log_rate_analysis/schema_v2';
import { AIOPS_TELEMETRY_ID } from '../../../common/constants';
import {
  getGroupTableItems,
  LogRateAnalysisResultsTable,
  LogRateAnalysisResultsGroupsTable,
} from '../log_rate_analysis_results_table';
import { useLogRateAnalysisResultsTableRowContext } from '../log_rate_analysis_results_table/log_rate_analysis_results_table_row_provider';

import { FieldFilterPopover } from './field_filter_popover';
import { LogRateAnalysisTypeCallOut } from './log_rate_analysis_type_callout';

const groupResultsMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResults',
  {
    defaultMessage: 'Smart grouping',
  }
);
const groupResultsHelpMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsHelpMessage',
  {
    defaultMessage: 'Items which are unique to a group are marked by an asterisk (*).',
  }
);
const groupResultsOffMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOff',
  {
    defaultMessage: 'Off',
  }
);
const groupResultsOnMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOn',
  {
    defaultMessage: 'On',
  }
);
const resultsGroupedOffId = 'aiopsLogRateAnalysisGroupingOff';
const resultsGroupedOnId = 'aiopsLogRateAnalysisGroupingOn';

/**
 * Interface for log rate analysis results data.
 */
export interface LogRateAnalysisResultsData {
  /** The type of analysis, whether it's a spike or dip */
  analysisType: LogRateAnalysisType;
  /** Statistically significant field/value items. */
  significantItems: SignificantItem[];
  /** Statistically significant groups of field/value items. */
  significantItemsGroups: SignificantItemGroup[];
}

/**
 * LogRateAnalysis props require a data view.
 */
interface LogRateAnalysisResultsProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The type of analysis, whether it's a spike or dip */
  analysisType?: LogRateAnalysisType;
  /** Start timestamp filter */
  earliest: number;
  /** End timestamp filter */
  latest: number;
  isBrushCleared: boolean;
  /** Option to make main histogram sticky */
  stickyHistogram?: boolean;
  /** Callback for resetting the analysis */
  onReset: () => void;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
  /** The search query to be applied to the analysis as a filter */
  searchQuery: estypes.QueryDslQueryContainer;
  /** Sample probability to be applied to random sampler aggregations */
  sampleProbability: number;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Optional callback that exposes data of the completed analysis */
  onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

export const LogRateAnalysisResults: FC<LogRateAnalysisResultsProps> = ({
  dataView,
  analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE,
  earliest,
  isBrushCleared,
  latest,
  stickyHistogram,
  onReset,
  windowParameters,
  searchQuery,
  sampleProbability,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
  embeddingOrigin,
}) => {
  const { http } = useAiopsAppContext();

  const { clearAllRowState } = useLogRateAnalysisResultsTableRowContext();

  const [currentAnalysisType, setCurrentAnalysisType] = useState<LogRateAnalysisType | undefined>();
  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [groupResults, setGroupResults] = useState<boolean>(false);
  const [groupSkipFields, setGroupSkipFields] = useState<string[]>([]);
  const [uniqueFieldNames, setUniqueFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<AiopsLogRateAnalysisSchema['overrides'] | undefined>(
    undefined
  );
  const [shouldStart, setShouldStart] = useState(false);
  const [toggleIdSelected, setToggleIdSelected] = useState(resultsGroupedOffId);

  const onGroupResultsToggle = (optionId: string) => {
    setToggleIdSelected(optionId);
    setGroupResults(optionId === resultsGroupedOnId);

    // When toggling the group switch, clear all row selections
    clearAllRowState();
  };

  const onFieldsFilterChange = (skippedFields: string[]) => {
    setGroupSkipFields(skippedFields);
    setOverrides({
      loaded: 0,
      remainingFieldCandidates: [],
      significantItems: data.significantItems.filter(
        (d) => !skippedFields.includes(d.fieldName)
      ) as AiopsLogRateAnalysisSchemaSignificantItem[],
      regroupOnly: true,
    });
    startHandler(true, false);
  };

  const {
    cancel,
    start,
    data,
    isRunning,
    errors: streamErrors,
  } = useFetchStream<AiopsLogRateAnalysisSchema<'2'>, typeof streamReducer>(
    http,
    '/internal/aiops/log_rate_analysis',
    '2',
    {
      start: earliest,
      end: latest,
      searchQuery: JSON.stringify(searchQuery),
      // TODO Handle data view without time fields.
      timeFieldName: dataView.timeFieldName ?? '',
      index: dataView.getIndexPattern(),
      grouping: true,
      flushFix: true,
      // If analysis type is `spike`, pass on window parameters as is,
      // if it's `dip`, swap baseline and deviation.
      ...(analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
        ? windowParameters
        : {
            baselineMin: windowParameters.deviationMin,
            baselineMax: windowParameters.deviationMax,
            deviationMin: windowParameters.baselineMin,
            deviationMax: windowParameters.baselineMax,
          }),
      overrides,
      sampleProbability,
    },
    { reducer: streamReducer, initialState },
    { [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin }
  );

  // jLouvain POC
  const d3El = useRef(null);
  const d3Init = useRef(false);
  useEffect(() => {
    console.log('data', data);
    let force;
    if (
      d3Init.current === false &&
      data.nodes.length > 0 &&
      data.edges.length > 0 &&
      d3El.current
    ) {
      d3Init.current = true;
      console.log('RENDER?', d3El.current);
      const d3Div = d3.select(d3El.current);

      const width = 800;
      const height = 400;

      const original_node_data = d3.entries(data.nodes);
      const original_edge_data = data.edges.map((d) => {
        const updatedSource = original_node_data.find((n) => n.value === d.source);
        const updatedTarget = original_node_data.find((n) => n.value === d.target);
        if (!updatedSource || !updatedTarget) {
          console.log('NOT FOUND !!!', JSON.stringify([d.source, d.target]));
        }
        d.source = updatedSource;
        d.target = updatedTarget;
        return d;
      });
      const max_weight = d3.max(original_edge_data, function (d) {
        return d.weight;
      });
      const weight_scale = d3.scale.linear().domain([0, max_weight]).range([1, 5]);

      force = d3.layout
        .force()
        .charge(-30)
        .linkDistance(40)
        .gravity(-0.01)
        // .center(width / 2, height / 2)
        .size([width, height]);

      const svg = d3Div.append('svg').attr('width', width).attr('height', height);

      console.log('original_node_data', original_node_data, original_edge_data);
      force.nodes(original_node_data).links(original_edge_data);

      const link = svg
        .selectAll('.link')
        .data(force.links())
        .enter()
        .append('line')
        .attr('class', 'link')
        .style('stroke-width', function (d) {
          return weight_scale(d.weight);
        })
        .style('stroke', '#999')
        .style('stroke-opacity', 0.6);

      const color = d3.scale.category20().domain(d3.range([0, data.nodes.length]));

      const node = svg
        .selectAll('.node')
        .data(force.nodes())
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', 5)
        // .style('fill', '#a30500')
        .style('fill', function (d) {
          // console.log('group', data.jLouvainResult[d.value]);
          return color(data.jLouvainResult[d.value]);
          return '#a30500';
          // return color(d.);
        })
        .style('stroke', '#fff')
        .style('stroke-width', '1.5px')
        .call(force.drag);

      force.on('tick', function () {
        const nodes = force.nodes();
        nodes[0].x = width / 2;
        nodes[0].y = height / 2;

        link
          .attr('x1', function (d) {
            return !isNaN(d.source.x) ? d.source.x : Math.random();
          })
          .attr('y1', function (d) {
            return !isNaN(d.source.y) ? d.source.y : Math.random();
          })
          .attr('x2', function (d) {
            return !isNaN(d.target.x) ? d.target.x : Math.random();
          })
          .attr('y2', function (d) {
            return !isNaN(d.target.y) ? d.target.y : Math.random();
          });

        node
          .attr('cx', function (d) {
            return !isNaN(d.x) ? d.x : Math.random();
          })
          .attr('cy', function (d) {
            return !isNaN(d.y) ? d.y : Math.random();
          });
      });

      force.start();
    }

    return () => {
      force && force.stop();
    };
  }, [data.nodes, data.edges, d3El.current]);

  const { significantItems, zeroDocsFallback } = data;

  useEffect(
    () => setUniqueFieldNames(uniq(significantItems.map((d) => d.fieldName)).sort()),
    [significantItems]
  );

  useEffect(() => {
    if (!isRunning) {
      const { loaded, remainingFieldCandidates, groupsMissing } = data;

      if (
        loaded < 1 &&
        ((Array.isArray(remainingFieldCandidates) && remainingFieldCandidates.length > 0) ||
          groupsMissing)
      ) {
        setOverrides({
          loaded,
          remainingFieldCandidates,
          significantItems: data.significantItems as AiopsLogRateAnalysisSchemaSignificantItem[],
        });
      } else {
        setOverrides(undefined);
        if (onAnalysisCompleted) {
          onAnalysisCompleted({
            analysisType,
            significantItems: data.significantItems,
            significantItemsGroups: data.significantItemsGroups,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // significant items on analysis refresh.
  function startHandler(continueAnalysis = false, resetGroupButton = true) {
    if (!continueAnalysis) {
      setOverrides(undefined);
      setUniqueFieldNames([]);
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    if (resetGroupButton) {
      setGroupResults(false);
      setToggleIdSelected(resultsGroupedOffId);
      clearAllRowState();
    }

    setCurrentAnalysisType(analysisType);
    setCurrentAnalysisWindowParameters(windowParameters);

    // We trigger hooks updates above so we cannot directly call `start()` here
    // because it would be run with stale arguments.
    setShouldStart(true);
  }

  useEffect(() => {
    if (shouldStart) {
      start();
      setShouldStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart]);

  useEffect(() => {
    setCurrentAnalysisType(analysisType);
    setCurrentAnalysisWindowParameters(windowParameters);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTableItems = useMemo(
    () => getGroupTableItems(data.significantItemsGroups),
    [data.significantItemsGroups]
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const showLogRateAnalysisResultsTable = data?.significantItems.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.groupItemsSortedByUniqueness.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;
  const timeRangeMs = { from: earliest, to: latest };

  // Disable the grouping switch toggle only if no groups were found,
  // the toggle wasn't enabled already and no fields were selected to be skipped.
  const disabledGroupResultsSwitch = !foundGroups && !groupResults && groupSkipFields.length === 0;

  const toggleButtons = [
    {
      id: resultsGroupedOffId,
      label: groupResultsOffMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOff',
    },
    {
      id: resultsGroupedOnId,
      label: groupResultsOnMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOn',
    },
  ];

  return (
    <div data-test-subj="aiopsLogRateAnalysisResults">
      <ProgressControls
        isBrushCleared={isBrushCleared}
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={() => startHandler(false)}
        onCancel={cancel}
        onReset={onReset}
        shouldRerunAnalysis={shouldRerunAnalysis}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressedSwitch">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{groupResultsMessage}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  data-test-subj={`aiopsLogRateAnalysisGroupSwitch${
                    groupResults ? ' checked' : ''
                  }`}
                  buttonSize="s"
                  isDisabled={disabledGroupResultsSwitch}
                  legend="Smart grouping"
                  options={toggleButtons}
                  idSelected={toggleIdSelected}
                  onChange={onGroupResultsToggle}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldFilterPopover
            disabled={!groupResults || isRunning}
            disabledApplyButton={isRunning}
            uniqueFieldNames={uniqueFieldNames}
            onChange={onFieldsFilterChange}
          />
        </EuiFlexItem>
      </ProgressControls>
      {showLogRateAnalysisResultsTable && currentAnalysisType !== undefined && (
        <>
          <EuiSpacer size="s" />
          <LogRateAnalysisTypeCallOut
            analysisType={currentAnalysisType}
            zeroDocsFallback={zeroDocsFallback}
          />
          <EuiSpacer size="xs" />
        </>
      )}
      {errors.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            title={i18n.translate('xpack.aiops.analysis.errorCallOutTitle', {
              defaultMessage:
                'The following {errorCount, plural, one {error} other {errors}} occurred running the analysis.',
              values: { errorCount: errors.length },
            })}
            color="warning"
            iconType="warning"
            size="s"
          >
            <EuiText size="s">
              {errors.length === 1 ? (
                <p>{errors[0]}</p>
              ) : (
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {overrides !== undefined ? (
                <p>
                  <EuiButton
                    data-test-subj="aiopsLogRateAnalysisResultsTryToContinueAnalysisButton"
                    size="s"
                    onClick={() => startHandler(true)}
                  >
                    <FormattedMessage
                      id="xpack.aiops.logRateAnalysis.page.tryToContinueAnalysisButtonText"
                      defaultMessage="Try to continue analysis"
                    />
                  </EuiButton>
                </p>
              ) : null}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      {showLogRateAnalysisResultsTable && groupResults && foundGroups && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{groupResults ? groupResultsHelpMessage : undefined}</EuiText>
        </>
      )}
      <EuiSpacer size="xs" />
      {!isRunning && !showLogRateAnalysisResultsTable && (
        <EuiEmptyPrompt
          data-test-subj="aiopsNoResultsFoundEmptyPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptTitle"
                defaultMessage="The analysis did not return any results."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptBody"
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this deviation in log rate."
              />
            </p>
          }
        />
      )}
      {/* Using inline style as Eui Table overwrites overflow settings  */}
      <div
        style={
          stickyHistogram
            ? {
                height: '500px',
                overflowX: 'hidden',
                overflowY: 'auto',
                paddingTop: '20px',
              }
            : undefined
        }
      >
        {showLogRateAnalysisResultsTable && groupResults ? (
          <>
            <div css={{ width: '800px', height: '400px' }} ref={d3El}>
              jLouvain
            </div>
            <LogRateAnalysisResultsGroupsTable
              significantItems={data.significantItems}
              groupTableItems={groupTableItems}
              loading={isRunning}
              dataView={dataView}
              timeRangeMs={timeRangeMs}
              searchQuery={searchQuery}
              barColorOverride={barColorOverride}
              barHighlightColorOverride={barHighlightColorOverride}
              zeroDocsFallback={zeroDocsFallback}
            />
          </>
        ) : null}
        {showLogRateAnalysisResultsTable && !groupResults ? (
          <LogRateAnalysisResultsTable
            significantItems={data.significantItems}
            loading={isRunning}
            dataView={dataView}
            timeRangeMs={timeRangeMs}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
            zeroDocsFallback={zeroDocsFallback}
          />
        ) : null}
      </div>
    </div>
  );
};
