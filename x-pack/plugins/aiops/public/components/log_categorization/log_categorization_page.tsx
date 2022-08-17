/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import rison from 'rison-node';
import { merge, lastValueFrom } from 'rxjs';
import moment from 'moment';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  // SearchFilterConfig,
  EuiBasicTableColumn,
  EuiCode,
  EuiText,
  EuiTableSelectionType,
  EuiPageBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  // EuiHorizontalRule,
  EuiTitle,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
} from '@elastic/eui';
import {
  // SEARCH_QUERY_LANGUAGE,
  // SearchQueryLanguage,
  SavedSearchSavedObject,
} from '../../application/utils/search_utils';
import { useAiOpsKibana } from '../../kibana_context';
import { API_ENDPOINT } from '../../../common/api';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { useTimefilter } from '../../hooks/use_time_filter';
import { TimeBuckets } from '../../../common/time_buckets';
import { MiniHistogram } from '../mini_histogram';
import { DocumentCountChart } from '../document_count_content/document_count_chart';
import { useEuiTheme } from '../../hooks/use_eui_theme';

export interface LogCategorizationPageProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

const QUERY_MODE = {
  INCLUDE: 'should',
  EXCLUDE: 'must_not',
} as const;
export type QueryMode = typeof QUERY_MODE[keyof typeof QUERY_MODE];

interface Category {
  key: string;
  count: number;
  examples: string[];
  sparkline?: Array<{ doc_count: number; key: number; key_as_string: string }>;
}

type SparkLinesPerCategory = Record<string, Record<number, number>>;

export const LogCategorizationPage: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
}) => {
  const euiTheme = useEuiTheme();
  const {
    services: {
      http: { fetch, basePath },
      uiSettings,
      data,
    },
  } = useAiOpsKibana();
  const [field, setField] = useState<string | undefined>();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [selection, setSelection] = useState<Category[]>([]);
  const [eventRate, setEventRate] = useState<
    Array<{
      key: number;
      docCount: number;
      keyAsString: string;
    }>
  >([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sparkLines, setSparkLines] = useState<SparkLinesPerCategory>({});

  const _timeBuckets = useMemo(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  const fields = dataView.fields
    .getByType('string')
    .filter(({ displayName }) => !['_id', '_index'].includes(displayName))
    .map(({ displayName }) => ({
      label: displayName,
    }));

  useEffect(() => {
    if (fields.length === 1) {
      setField(fields[0].label);
    }
  }, [fields]);

  const timefilter = useTimefilter({
    timeRangeSelector: dataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const loadCategories = useCallback(async () => {
    setCategories(null);
    const { title: index, timeFieldName: timeField } = dataView;

    if (field === undefined || timeField === undefined) {
      return;
    }

    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (timefilterActiveBounds === undefined) {
      return;
    }
    const from = timefilterActiveBounds.min?.valueOf();
    const to = timefilterActiveBounds.max?.valueOf();

    const BAR_TARGET = 20;
    _timeBuckets.setInterval('auto');
    _timeBuckets.setBounds(timefilterActiveBounds);
    _timeBuckets.setBarTarget(BAR_TARGET);
    const intervalMs = _timeBuckets.getInterval()?.asMilliseconds();

    const erResp = await lastValueFrom(
      data.search.search<
        any,
        {
          rawResponse: {
            aggregations?: Record<string, estypes.AggregationsAggregate> & {
              eventRate?: {
                buckets: Array<{ key: number; key_as_string: string; doc_count: number }>;
              };
            };
          };
        }
      >({
        params: {
          index,
          size: 0,
          body: {
            query: {
              bool: {
                must: [
                  {
                    range: {
                      [timeField]: {
                        gte: from,
                        lte: to,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          match_all: {},
                        },
                      ],
                    },
                  },
                ],
              },
            },
            _source: {
              excludes: [],
            },
            aggs: {
              eventRate: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${intervalMs}ms`,
                  min_doc_count: 0,
                  extended_bounds: {
                    min: from,
                    max: to,
                  },
                },
              },
            },
          },
        },
      })
    );
    setEventRate(
      erResp.rawResponse!.aggregations!.eventRate!.buckets!.map((b) => ({
        key: b.key,
        keyAsString: b.key_as_string,
        docCount: b.doc_count,
      }))
    );

    const body = JSON.stringify({
      index,
      field,
      timeField,
      from,
      to,
      intervalMs,
    });
    const resp = await fetch<Category[]>({ path: API_ENDPOINT.CATEGORIZE, method: 'POST', body });
    // console.log(resp);
    setCategories(resp);
    const gg: SparkLinesPerCategory = resp.reduce((acc, cur) => {
      acc[cur.key] =
        cur.sparkline === undefined
          ? {}
          : cur.sparkline.reduce((acc2, cur2) => {
              acc2[cur2.key] = cur2.doc_count;
              return acc2;
            }, {} as Record<number, number>);
      return acc;
    }, {} as SparkLinesPerCategory);
    setSparkLines(gg);
  }, [fetch, field, dataView, timefilter, _timeBuckets, data]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, fetch, field, dataView, timefilter]);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$()
    ).subscribe(() => {
      loadCategories();
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  const openInDiscover = (mode: QueryMode, category?: Category) => {
    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (timefilterActiveBounds === undefined || field === undefined) {
      return;
    }

    const selectedRows = category === undefined ? selection : [category];

    const from = moment(timefilterActiveBounds.min?.valueOf()).toISOString();
    const to = moment(timefilterActiveBounds.max?.valueOf()).toISOString();

    const _g = rison.encode({
      filters: [],
      refreshInterval: {
        pause: false,
        value: 30000,
      },
      time: {
        from,
        to,
      },
    });

    const _a = rison.encode({
      columns: [],
      filters: [
        {
          query: {
            bool: {
              [mode]: selectedRows.map(({ key: query }) => ({
                match: {
                  [field]: {
                    auto_generate_synonyms_phrase_query: false,
                    fuzziness: 0,
                    operator: 'and',
                    query,
                  },
                },
              })),
            },
          },
        },
      ],
      index: dataView.id,
      interval: 'auto',
      query: {
        language: 'kuery',
        query: '',
      },
      sort: [['timestamp', 'desc']],
      viewMode: 'documents',
    });

    let path = basePath.get();
    path += '/app/discover#/';
    path += '?_g=' + _g;
    path += '&_a=' + encodeURIComponent(_a);
    window.open(path, '_blank');
  };

  const columns = [
    {
      field: 'count',
      name: 'Count',
      sortable: true,
      width: '80px',
    },
    {
      field: 'count',
      name: 'Sparkline',
      sortable: true,
      width: '100px',
      render: (_, { key }) => {
        const gg = sparkLines[key];
        if (gg === undefined) {
          return null;
        }
        const histogram = eventRate.map((e) => ({
          // doc_count_overall: gg[e.key],
          // doc_count_change_point: 0,
          doc_count_overall: e.docCount,
          doc_count_change_point: gg[e.key],
          key: e.key,
          key_as_string: e.keyAsString,
        }));

        return (
          <MiniHistogram
            chartData={histogram}
            isLoading={categories === null && histogram === undefined}
            label={''}
            // label={`${fieldName}:${fieldValue}`}
          />
        );
      },
    },
    {
      field: 'examples',
      name: 'Examples',
      sortable: true,
      style: { display: 'block' },
      render: (examples: string[]) => (
        <div style={{ display: 'block' }}>
          {examples.map((e) => (
            <>
              <EuiText size="s">
                <EuiCode language="log" transparentBackground>
                  {e}
                </EuiCode>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ))}
        </div>
      ),
    },
    {
      name: '',
      width: 40,
      actions: [
        {
          name: 'Show these in discover',
          icon: 'filter',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.INCLUDE, category),
        },
        {
          name: 'Filter out in discover',
          icon: 'filter',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.EXCLUDE, category),
        },
        {
          name: 'Open in data visualizer',
          icon: 'stats',
          type: 'icon',
          onClick: () => {},
        },
      ],
    },
  ] as Array<EuiBasicTableColumn<Category>>;

  const selectionValue: EuiTableSelectionType<Category> | undefined = {
    selectable: () => true,
    onSelectionChange: (selectedItems) => setSelection(selectedItems),
  };

  const onFieldChange = (value: EuiComboBoxOptionOption[] | undefined) => {
    setField(value && value.length ? value[0].label : undefined);
  };

  const getChartPoints = () => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return eventRate.map(({ key, docCount }) => {
      let value = docCount;
      if (category && sparkLines[category.key] && sparkLines[category.key][key]) {
        value -= sparkLines[category.key][key];
      }
      return { time: key, value };
    });
  };

  const getChartPointsSplit = () => {
    const category = selectedCategory ?? pinnedCategory ?? null;
    return category !== null && category.sparkline !== undefined
      ? eventRate.map(({ key }) => {
          const value =
            sparkLines && sparkLines[category.key] && sparkLines[category.key][key]
              ? sparkLines[category.key][key]
              : 0;
          return { time: key, value };
        })
      : undefined;
  };

  const getRowStyle = (category: Category) => {
    if (
      pinnedCategory &&
      pinnedCategory.key === category.key &&
      pinnedCategory.key === category.key
    ) {
      return {
        backgroundColor: 'rgb(227,240,249,0.37)',
      };
    }

    if (
      selectedCategory &&
      selectedCategory.key === category.key &&
      selectedCategory.key === category.key
    ) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: 'white',
    };
  };

  return (
    <EuiPageBody data-test-subj="aiopsExplainLogRateSpikesPage" paddingSize="none" panelled={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="dataViewTitleHeader">
                <EuiTitle size={'s'}>
                  <h2>{dataView.getName()}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
                <EuiFlexItem grow={false}>
                  <FullTimeRangeSelector
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiFormRow label="Category field">
            <EuiComboBox
              compressed={true}
              options={fields}
              onChange={onFieldChange}
              selectedOptions={field === undefined ? undefined : [{ label: field }]}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* <EuiHorizontalRule /> */}
      {eventRate.length ? (
        <>
          <EuiSpacer />
          <DocumentCountChart
            chartPoints={getChartPoints()}
            chartPointsSplit={getChartPointsSplit()}
            // chartPointsSplit={
            //   selectedCategory !== null && selectedCategory.sparkline !== undefined
            //     ? selectedCategory.sparkline.map((s) => ({ time: s.key, value: s.doc_count }))
            //     : undefined
            // }
            timeRangeEarliest={eventRate[0].key}
            timeRangeLatest={eventRate[eventRate.length - 1].key}
            interval={10}
            changePoint={undefined}
            isBrushCleared={false}
          />
          <EuiSpacer />
        </>
      ) : null}
      {categories !== null ? (
        <>
          {selection.length > 0 ? (
            <>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.EXCLUDE)}>
                    Filter out in discover
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.INCLUDE)}>
                    Show these in discover
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
          <EuiInMemoryTable<Category>
            compressed
            items={categories}
            columns={columns}
            isSelectable={true}
            selection={selectionValue}
            itemId="key"
            // search={{
            //   box: {
            //     incremental: true,
            //   },
            //   filters,
            // }}
            // onTableChange={onTableChange}
            // pagination={pagination}
            // sorting={sorting}
            // rowProps={(item) => ({
            //   'data-test-subj': `mlSpacesManagementTable-${currentTabId} row-${item.id}`,
            // })}
            rowProps={(category) => {
              return {
                onClick: () => {
                  if (category.key === pinnedCategory?.key) {
                    setPinnedCategory(null);
                  } else {
                    setPinnedCategory(category);
                  }
                },
                onMouseEnter: () => {
                  setSelectedCategory(category);
                },
                onMouseLeave: () => {
                  setSelectedCategory(null);
                },
                style: getRowStyle(category),
              };
            }}
          />
        </>
      ) : null}
    </EuiPageBody>
  );
};
