/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
  EuiDataGridSorting,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { last } from 'lodash';
import React, { forwardRef, Ref, useMemo, useState } from 'react';
import { GridOnScrollProps } from 'react-window';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { TopNFunctions, TopNFunctionSortField } from '../../../common/functions';
import { CPULabelWithHint } from '../cpu_label_with_hint';
<<<<<<< HEAD
import { FrameInformationTooltip } from '../frame_information_window/frame_information_tooltip';
import { LabelWithHint } from '../label_with_hint';
import { FunctionRow } from './function_row';
import { getFunctionsRows, IFunctionRow } from './utils';
=======
import { StackFrameSummary } from '../stack_frame_summary';
import { GetLabel } from './get_label';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPUPerc: number;
  inclusiveCPUPerc: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
  impactEstimates?: ReturnType<typeof calculateImpactEstimates>;
  diff?: {
    rank: number;
    samples: number;
    exclusiveCPUPerc: number;
    inclusiveCPUPerc: number;
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

function TotalSamplesStat({
  baselineTotalSamples,
  baselineScaleFactor,
  comparisonTotalSamples,
  comparisonScaleFactor,
}: {
  baselineTotalSamples: number;
  baselineScaleFactor?: number;
  comparisonTotalSamples?: number;
  comparisonScaleFactor?: number;
}) {
  const scaledBaselineTotalSamples = scaleValue({
    value: baselineTotalSamples,
    scaleFactor: baselineScaleFactor,
  });

  const value = scaledBaselineTotalSamples.toLocaleString();

  const sampleHeader = i18n.translate('xpack.profiling.functionsView.totalSampleCountLabel', {
    defaultMessage: ' Total sample estimate: ',
  });

  if (comparisonTotalSamples === undefined || comparisonTotalSamples === 0) {
    return (
      <EuiStat
        title={<EuiText style={{ fontWeight: 'bold' }}>{value}</EuiText>}
        description={sampleHeader}
      />
    );
  }

  const scaledComparisonTotalSamples = scaleValue({
    value: comparisonTotalSamples,
    scaleFactor: comparisonScaleFactor,
  });

  const diffSamples = scaledBaselineTotalSamples - scaledComparisonTotalSamples;
  const percentDelta = (diffSamples / (scaledBaselineTotalSamples - diffSamples)) * 100;

  return (
    <EuiStat
      title={
        <EuiText style={{ fontWeight: 'bold' }}>
          {value}
          <GetLabel value={percentDelta} prepend="(" append=")" />
        </EuiText>
      }
      description={sampleHeader}
    />
  );
}

function SampleStat({
  samples,
  diffSamples,
  totalSamples,
  isSampled,
}: {
  samples: number;
  diffSamples?: number;
  totalSamples: number;
  isSampled: boolean;
}) {
  const samplesLabel = `${isSampled ? '~ ' : ''}${samples.toLocaleString()}`;

  if (diffSamples === undefined || diffSamples === 0 || totalSamples === 0) {
    return <>{samplesLabel}</>;
  }

  const percentDelta = (diffSamples / (samples - diffSamples)) * 100;
  const totalPercentDelta = (diffSamples / totalSamples) * 100;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{samplesLabel}</EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={percentDelta} append=" rel" />
      </EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={totalPercentDelta} append=" abs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CPUStat({ cpu, diffCPU }: { cpu: number; diffCPU?: number; isSampled?: boolean }) {
  const cpuLabel = `${cpu.toFixed(2)}%`;

  if (diffCPU === undefined || diffCPU === 0) {
    return <>{cpuLabel}</>;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{cpuLabel}</EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={diffCPU} prepend="(" append=")" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
>>>>>>> whats-new

interface Props {
  topNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  totalSeconds: number;
  isDifferentialView: boolean;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  onFrameClick?: (functionName: string) => void;
  onScroll?: (scroll: GridOnScrollProps) => void;
  showDiffColumn?: boolean;
  pageIndex: number;
  onChangePage: (nextPage: number) => void;
  sortField: TopNFunctionSortField;
  sortDirection: 'asc' | 'desc';
  onChangeSort: (sorting: EuiDataGridSorting['columns'][0]) => void;
}

export const TopNFunctionsGrid = forwardRef(
  (
    {
      topNFunctions,
      comparisonTopNFunctions,
      totalSeconds,
      isDifferentialView,
      baselineScaleFactor,
      comparisonScaleFactor,
      onFrameClick,
      onScroll,
      showDiffColumn = false,
      pageIndex,
      onChangePage,
      sortField,
      sortDirection,
      onChangeSort,
    }: Props,
    ref: Ref<EuiDataGridRefProps> | undefined
  ) => {
    const [selectedRow, setSelectedRow] = useState<IFunctionRow | undefined>();
    const trackProfilingEvent = useUiTracker({ app: 'profiling' });

    function onSort(newSortingColumns: EuiDataGridSorting['columns']) {
      const lastItem = last(newSortingColumns);
      if (lastItem) {
        onChangeSort(lastItem);
      }
    }

<<<<<<< HEAD
    const totalCount = useMemo(() => {
      if (!topNFunctions || !topNFunctions.TotalCount) {
        return 0;
      }

      return topNFunctions.TotalCount;
    }, [topNFunctions]);
=======
    return topNFunctions.TotalCount;
  }, [topNFunctions]);

  const rows: Row[] = useMemo(() => {
    if (!topNFunctions || !topNFunctions.TotalCount || topNFunctions.TotalCount === 0) {
      return [];
    }

    const comparisonDataById = comparisonTopNFunctions
      ? keyBy(comparisonTopNFunctions.TopN, 'Id')
      : {};

    return topNFunctions.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => {
      const comparisonRow = comparisonDataById?.[topN.Id];

      const topNCountExclusiveScaled = scaleValue({
        value: topN.CountExclusive,
        scaleFactor: baselineScaleFactor,
      });

      const inclusiveCPUPerc = (topN.CountInclusive / topNFunctions.TotalCount) * 100;
      const exclusiveCPUPerc = (topN.CountExclusive / topNFunctions.TotalCount) * 100;
      const totalSamples = topN.CountExclusive;

      const impactEstimates =
        totalSeconds > 0
          ? calculateImpactEstimates({
              countExclusive: topN.CountExclusive,
              countInclusive: topN.CountInclusive,
              totalSamples,
              totalSeconds,
            })
          : undefined;

      function calculateDiff() {
        if (comparisonTopNFunctions && comparisonRow) {
          const comparisonCountExclusiveScaled = scaleValue({
            value: comparisonRow.CountExclusive,
            scaleFactor: comparisonScaleFactor,
          });

          return {
            rank: topN.Rank - comparisonRow.Rank,
            samples: topNCountExclusiveScaled - comparisonCountExclusiveScaled,
            exclusiveCPU: comparisonRow.CountExclusive,
            inclusiveCPU: comparisonRow.CountInclusive,
            exclusiveCPUPerc:
              exclusiveCPUPerc -
              (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
            inclusiveCPUPerc:
              inclusiveCPUPerc -
              (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
          };
        }
      }

      return {
        rank: topN.Rank,
        frame: topN.Frame,
        samples: topNCountExclusiveScaled,
        exclusiveCPUPerc,
        inclusiveCPUPerc,
        exclusiveCPU: topN.CountExclusive,
        inclusiveCPU: topN.CountInclusive,
        impactEstimates,
        diff: calculateDiff(),
      };
    });
  }, [
    topNFunctions,
    comparisonTopNFunctions,
    totalSeconds,
    comparisonScaleFactor,
    baselineScaleFactor,
  ]);
>>>>>>> whats-new

    const rows = useMemo(() => {
      return getFunctionsRows({
        baselineScaleFactor,
        comparisonScaleFactor,
        comparisonTopNFunctions,
        topNFunctions,
      });
    }, [topNFunctions, comparisonTopNFunctions, comparisonScaleFactor, baselineScaleFactor]);

    const { columns, leadingControlColumns } = useMemo(() => {
      const gridColumns: EuiDataGridColumn[] = [
        {
          id: TopNFunctionSortField.Rank,
          initialWidth: isDifferentialView ? 50 : 90,
          displayAsText: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
            defaultMessage: 'Rank',
          }),
        },
        {
          id: TopNFunctionSortField.Frame,
          displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
            defaultMessage: 'Function',
          }),
        },
        {
          id: TopNFunctionSortField.Samples,
          initialWidth: isDifferentialView ? 100 : 200,
          schema: 'samples',
          display: (
            <LabelWithHint
              label={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
                defaultMessage: 'Samples',
              })}
              hint={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
                defaultMessage: 'Estimated values',
              })}
              labelSize="s"
              labelStyle={{ fontWeight: 700 }}
              iconSize="s"
            />
          ),
        },
        {
          id: TopNFunctionSortField.SelfCPU,
          initialWidth: isDifferentialView ? 100 : 200,
          display: (
            <CPULabelWithHint
              type="self"
              labelSize="s"
              labelStyle={{ fontWeight: 700 }}
              iconSize="s"
            />
          ),
        },
        {
          id: TopNFunctionSortField.TotalCPU,
          initialWidth: isDifferentialView ? 100 : 200,
          display: (
            <CPULabelWithHint
              type="total"
              labelSize="s"
              labelStyle={{ fontWeight: 700 }}
              iconSize="s"
            />
          ),
        },
      ];

      const gridLeadingControlColumns: EuiDataGridControlColumn[] = [];
      if (showDiffColumn) {
        gridColumns.push({
          initialWidth: 60,
          id: TopNFunctionSortField.Diff,
          displayAsText: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
            defaultMessage: 'Diff',
          }),
        });
      }

      if (!isDifferentialView) {
        gridColumns.push(
          {
            id: TopNFunctionSortField.AnnualizedCo2,
            initialWidth: isDifferentialView ? 100 : 200,
            schema: 'numeric',
            display: (
              <LabelWithHint
                label={i18n.translate('xpack.profiling.functionsView.annualizedCo2', {
                  defaultMessage: 'Annualized CO2',
                })}
                hint={i18n.translate('xpack.profiling.functionsView.annualizedCo2.hint', {
                  defaultMessage:
                    'Indicates the CO2 emission of the function and any functions called by it.',
                })}
                labelSize="s"
                labelStyle={{ fontWeight: 700 }}
                iconSize="s"
              />
            ),
          },
          {
            id: TopNFunctionSortField.AnnualizedDollarCost,
            initialWidth: isDifferentialView ? 100 : 200,
            display: (
              <LabelWithHint
                label={i18n.translate('xpack.profiling.functionsView.annualizedDollarCost', {
                  defaultMessage: `Annualized dollar cost`,
                })}
                hint={i18n.translate('xpack.profiling.functionsView.annualizedDollarCost.hint', {
                  defaultMessage: `Indicates the Dollar cost of the function and any functions called by it.`,
                })}
                labelSize="s"
                labelStyle={{ fontWeight: 700 }}
                iconSize="s"
              />
            ),
          }
        );

        gridLeadingControlColumns.push({
          id: 'actions',
          width: 40,
          headerCellRender() {
            return (
              <EuiScreenReaderOnly>
                <span>Controls</span>
              </EuiScreenReaderOnly>
            );
          },
          rowCellRender: function RowCellRender({ rowIndex }) {
            function handleOnClick() {
              trackProfilingEvent({ metric: 'topN_function_details_click' });
              setSelectedRow(rows[rowIndex]);
            }
            return (
              <EuiButtonIcon
                aria-label="Show actions"
                iconType="expand"
                color="text"
                onClick={handleOnClick}
              />
            );
          },
        });
      }
      return { columns: gridColumns, leadingControlColumns: gridLeadingControlColumns };
    }, [isDifferentialView, rows, showDiffColumn, trackProfilingEvent]);

    const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

    function RenderCellValue({
      rowIndex,
      columnId,
      setCellProps,
    }: EuiDataGridCellValueElementProps) {
      const data = rows[rowIndex];
      if (data) {
        return (
          <FunctionRow
            functionRow={data}
            columnId={columnId}
            totalCount={totalCount}
            onFrameClick={onFrameClick}
            setCellProps={setCellProps}
          />
        );
<<<<<<< HEAD
=======
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: (
        <CPULabelWithHint
          type="self"
          labelSize="xs"
          labelStyle={{ fontWeight: 600 }}
          iconSize="s"
        />
      ),
      render: (_, { exclusiveCPUPerc, diff }) => {
        return <CPUStat cpu={exclusiveCPUPerc} diffCPU={diff?.exclusiveCPUPerc} />;
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: (
        <CPULabelWithHint
          type="total"
          labelSize="xs"
          labelStyle={{ fontWeight: 600 }}
          iconSize="s"
        />
      ),
      render: (_, { inclusiveCPUPerc, diff }) => {
        return <CPUStat cpu={inclusiveCPUPerc} diffCPU={diff?.inclusiveCPUPerc} />;
      },
      align: 'right',
    },
  ];

  if (comparisonTopNFunctions) {
    columns.push({
      field: TopNFunctionSortField.Diff,
      name: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
        defaultMessage: 'Diff',
      }),
      align: 'right',
      render: (_, { diff }) => {
        if (!diff) {
          return (
            <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
              {i18n.translate('xpack.profiling.functionsView.newLabel', { defaultMessage: 'New' })}
            </EuiText>
          );
        }

        if (diff.rank === 0) {
          return null;
        }

        const color = diff.rank > 0 ? 'success' : 'danger';
        const icon = diff.rank > 0 ? 'sortDown' : 'sortUp';

        return (
          <EuiBadge
            color={color}
            iconType={icon}
            iconSide="right"
            style={{ minWidth: '100%', textAlign: 'right' }}
          >
            {diff.rank}
          </EuiBadge>
        );
      },
    });
  }
  if (!isDifferentialView) {
    columns.push(
      {
        field: 'annualized_co2',
        name: i18n.translate('xpack.profiling.functionsView.annualizedCo2', {
          defaultMessage: 'Annualized CO2',
        }),
        render: (_, { impactEstimates }) => {
          if (impactEstimates?.annualizedCo2) {
            return <div>{asWeight(impactEstimates.annualizedCo2)}</div>;
          }
        },
        align: 'right',
      },
      {
        field: 'annualized_dollar_cost',
        name: i18n.translate('xpack.profiling.functionsView.annualizedDollarCost', {
          defaultMessage: `Annualized dollar cost`,
        }),
        render: (_, { impactEstimates }) => {
          if (impactEstimates?.annualizedDollarCost) {
            return <div>{asCost(impactEstimates.annualizedDollarCost)}</div>;
          }
        },
        align: 'right',
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'show_more_information',
            description: i18n.translate('xpack.profiling.functionsView.showMoreButton', {
              defaultMessage: `Show more information`,
            }),
            icon: 'inspect',
            color: 'primary',
            type: 'icon',
            onClick: setSelectedRow,
          },
        ],
>>>>>>> whats-new
      }
      return null;
    }

    return (
      <>
        <EuiDataGrid
          ref={ref}
          aria-label="TopN functions"
          columns={columns}
          columnVisibility={{ visibleColumns, setVisibleColumns }}
          rowCount={100}
          renderCellValue={RenderCellValue}
          inMemory={{ level: 'sorting' }}
          sorting={{ columns: [{ id: sortField, direction: sortDirection }], onSort }}
          leadingControlColumns={leadingControlColumns}
          pagination={{
            pageIndex,
            pageSize: 50,
            // Left it empty on purpose as it is a required property on the pagination
            onChangeItemsPerPage: () => {},
            onChangePage,
          }}
          rowHeightsOptions={{ defaultHeight: 'auto' }}
          toolbarVisibility={{
            showColumnSelector: false,
            showKeyboardShortcuts: !isDifferentialView,
            showDisplaySelector: !isDifferentialView,
            showFullScreenSelector: !isDifferentialView,
            showSortSelector: false,
          }}
          virtualizationOptions={{
            onScroll,
          }}
          schemaDetectors={[
            {
              type: 'samples',
              comparator: (a, b, direction) => {
                const aNumber = parseFloat(a.replace(/,/g, ''));
                const bNumber = parseFloat(b.replace(/,/g, ''));

                if (aNumber < bNumber) {
                  return direction === 'desc' ? 1 : -1;
                }
                if (aNumber > bNumber) {
                  return direction === 'desc' ? -1 : 1;
                }
                return 0;
              },
              detector: (a) => {
                return 1;
              },
              icon: '',
              sortTextAsc: 'Low-High',
              sortTextDesc: 'High-Low',
            },
          ]}
        />
        {selectedRow && (
          <FrameInformationTooltip
            onClose={() => {
              setSelectedRow(undefined);
            }}
            frame={{
              addressOrLine: selectedRow.frame.AddressOrLine,
              countExclusive: selectedRow.selfCPU,
              countInclusive: selectedRow.totalCPU,
              exeFileName: selectedRow.frame.ExeFileName,
              fileID: selectedRow.frame.FileID,
              frameType: selectedRow.frame.FrameType,
              functionName: selectedRow.frame.FunctionName,
              sourceFileName: selectedRow.frame.SourceFilename,
              sourceLine: selectedRow.frame.SourceLine,
            }}
            totalSeconds={totalSeconds}
            totalSamples={totalCount}
            samplingRate={topNFunctions?.SamplingRate ?? 1.0}
          />
        )}
      </>
    );
  }
<<<<<<< HEAD
);
=======

  const sortedRows = orderBy(
    rows,
    (row) => {
      return sortField === TopNFunctionSortField.Frame
        ? getCalleeFunction(row.frame).toLowerCase()
        : row[sortField];
    },
    [sortDirection]
  ).slice(0, 100);
  return (
    <>
      <TotalSamplesStat
        baselineTotalSamples={totalCount}
        baselineScaleFactor={baselineScaleFactor}
        comparisonTotalSamples={comparisonTopNFunctions?.TotalCount}
        comparisonScaleFactor={comparisonScaleFactor}
      />
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        items={sortedRows}
        columns={columns}
        tableLayout="auto"
        onChange={(criteria) => {
          onSortChange({
            sortDirection: criteria.sort!.direction,
            sortField: criteria.sort!.field as TopNFunctionSortField,
          });
        }}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
      />
      {selectedRow && (
        <FrameInformationTooltip
          onClose={() => {
            setSelectedRow(undefined);
          }}
          frame={{
            addressOrLine: selectedRow.frame.AddressOrLine,
            countExclusive: selectedRow.exclusiveCPU,
            countInclusive: selectedRow.inclusiveCPU,
            exeFileName: selectedRow.frame.ExeFileName,
            fileID: selectedRow.frame.FileID,
            frameType: selectedRow.frame.FrameType,
            functionName: selectedRow.frame.FunctionName,
            sourceFileName: selectedRow.frame.SourceFilename,
            sourceLine: selectedRow.frame.SourceLine,
          }}
          totalSeconds={totalSeconds ?? 0}
          totalSamples={totalCount}
          samplingRate={topNFunctions?.SamplingRate ?? 1.0}
        />
      )}
    </>
  );
}
>>>>>>> whats-new
