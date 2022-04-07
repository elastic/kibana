/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_item.scss';

import React, { useCallback, useState, useMemo } from 'react';
import DateMath from '@elastic/datemath';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import {
  Axis,
  HistogramBarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FieldButton } from '@kbn/react-field';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { EuiHighlight } from '@elastic/eui';
import { Filter, buildEsQuery } from '@kbn/es-query';
import {
  Query,
  KBN_FIELD_TYPES,
  ES_FIELD_TYPES,
  getEsQueryConfig,
} from '../../../../../src/plugins/data/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { DragDrop, DragDropIdentifier } from '../drag_drop';
import { DatasourceDataPanelProps, DataType } from '../types';
import { BucketedAggregation, FieldStatsResponse } from '../../common';
import { IndexPattern, IndexPatternField, DraggedField } from './types';
import { LensFieldIcon } from './lens_field_icon';
import { trackUiEvent } from '../lens_ui_telemetry';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { VisualizeGeoFieldButton } from './visualize_geo_field_button';
import { getVisualizeGeoFieldMessage } from '../utils';

import { debouncedComponent } from '../debounced_component';

export interface FieldItemProps {
  core: DatasourceDataPanelProps['core'];
  fieldFormats: FieldFormatsStart;
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
  chartsThemeService: ChartsPluginSetup['theme'];
  filters: Filter[];
  hideDetails?: boolean;
  itemIndex: number;
  groupIndex: number;
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  editField?: (name: string) => void;
  removeField?: (name: string) => void;
  hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
  uiActions: UiActionsStart;
}

interface State {
  isLoading: boolean;
  totalDocuments?: number;
  sampledDocuments?: number;
  sampledValues?: number;
  histogram?: BucketedAggregation<number | string>;
  topValues?: BucketedAggregation<number | string>;
}

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export const InnerFieldItem = function InnerFieldItem(props: FieldItemProps) {
  const {
    core,
    field,
    indexPattern,
    highlight,
    exists,
    query,
    dateRange,
    filters,
    hideDetails,
    itemIndex,
    groupIndex,
    dropOntoWorkspace,
    editField,
    removeField,
  } = props;

  const [infoIsOpen, setOpen] = useState(false);

  const closeAndEdit = useMemo(
    () =>
      editField
        ? (name: string) => {
            editField(name);
            setOpen(false);
          }
        : undefined,
    [editField, setOpen]
  );

  const closeAndRemove = useMemo(
    () =>
      removeField
        ? (name: string) => {
            removeField(name);
            setOpen(false);
          }
        : undefined,
    [removeField, setOpen]
  );

  const dropOntoWorkspaceAndClose = useCallback(
    (droppedField: DragDropIdentifier) => {
      dropOntoWorkspace(droppedField);
      setOpen(false);
    },
    [dropOntoWorkspace, setOpen]
  );

  const [state, setState] = useState<State>({
    isLoading: false,
  });

  function fetchData() {
    // Range types don't have any useful stats we can show
    if (
      state.isLoading ||
      field.type === 'document' ||
      field.type.includes('range') ||
      field.type === 'geo_point' ||
      field.type === 'geo_shape'
    ) {
      return;
    }

    setState((s) => ({ ...s, isLoading: true }));

    core.http
      .post<FieldStatsResponse<string | number>>(`/api/lens/index_stats/${indexPattern.id}/field`, {
        body: JSON.stringify({
          dslQuery: buildEsQuery(indexPattern, query, filters, getEsQueryConfig(core.uiSettings)),
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          fieldName: field.name,
        }),
      })
      .then((results) => {
        setState((s) => ({
          ...s,
          isLoading: false,
          totalDocuments: results.totalDocuments,
          sampledDocuments: results.sampledDocuments,
          sampledValues: results.sampledValues,
          histogram: results.histogram,
          topValues: results.topValues,
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoading: false }));
      });
  }

  function togglePopover() {
    setOpen(!infoIsOpen);
    if (!infoIsOpen) {
      trackUiEvent('indexpattern_field_info_click');
      fetchData();
    }
  }

  const onDragStart = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const value = useMemo(
    () => ({
      field,
      indexPatternId: indexPattern.id,
      id: field.name,
      humanData: {
        label: field.displayName,
        position: itemIndex + 1,
      },
    }),
    [field, indexPattern.id, itemIndex]
  );
  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const lensFieldIcon = <LensFieldIcon type={field.type as DataType} />;
  const lensInfoIcon = (
    <EuiIconTip
      anchorClassName="lnsFieldItem__infoIcon"
      content={
        hideDetails
          ? i18n.translate('xpack.lens.indexPattern.fieldItemTooltip', {
              defaultMessage: 'Drag and drop to visualize.',
            })
          : exists
          ? i18n.translate('xpack.lens.indexPattern.fieldStatsButtonLabel', {
              defaultMessage: 'Click for a field preview, or drag and drop to visualize.',
            })
          : i18n.translate('xpack.lens.indexPattern.fieldStatsButtonEmptyLabel', {
              defaultMessage:
                'This field doesn’t have any data but you can still drag and drop to visualize.',
            })
      }
      type="iInCircle"
      color="subdued"
      size="s"
    />
  );
  return (
    <li>
      <EuiPopover
        ownFocus
        className="lnsFieldItem__popoverAnchor"
        display="block"
        data-test-subj="lnsFieldListPanelField"
        container={document.querySelector<HTMLElement>('.application') || undefined}
        button={
          <DragDrop
            draggable
            order={order}
            value={value}
            dataTestSubj={`lnsFieldListPanelField-${field.name}`}
            onDragStart={onDragStart}
          >
            <FieldButton
              className={`lnsFieldItem lnsFieldItem--${field.type} lnsFieldItem--${
                exists ? 'exists' : 'missing'
              }`}
              isActive={infoIsOpen}
              onClick={togglePopover}
              buttonProps={{
                ['aria-label']: i18n.translate(
                  'xpack.lens.indexPattern.fieldStatsButtonAriaLabel',
                  {
                    defaultMessage: 'Preview {fieldName}: {fieldType}',
                    values: {
                      fieldName: field.displayName,
                      fieldType: field.type,
                    },
                  }
                ),
              }}
              fieldIcon={lensFieldIcon}
              fieldName={
                <EuiHighlight search={wrapOnDot(highlight)}>
                  {wrapOnDot(field.displayName)}
                </EuiHighlight>
              }
              fieldInfoIcon={lensInfoIcon}
            />
          </DragDrop>
        }
        isOpen={infoIsOpen}
        closePopover={() => setOpen(false)}
        anchorPosition="rightUp"
        panelClassName="lnsFieldItem__fieldPanel"
        initialFocus=".lnsFieldItem__fieldPanel"
      >
        <FieldItemPopoverContents
          {...state}
          {...props}
          editField={closeAndEdit}
          removeField={closeAndRemove}
          dropOntoWorkspace={dropOntoWorkspaceAndClose}
        />
      </EuiPopover>
    </li>
  );
};

export const FieldItem = debouncedComponent(InnerFieldItem);

function FieldPanelHeader({
  indexPatternId,
  field,
  hasSuggestionForField,
  dropOntoWorkspace,
  editField,
  removeField,
}: {
  field: IndexPatternField;
  indexPatternId: string;
  hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  editField?: (name: string) => void;
  removeField?: (name: string) => void;
}) {
  const draggableField = {
    indexPatternId,
    id: field.name,
    field,
    humanData: {
      label: field.displayName,
    },
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5 className="eui-textBreakWord lnsFieldItem__fieldPanelTitle">{field.displayName}</h5>
        </EuiTitle>
      </EuiFlexItem>

      <DragToWorkspaceButton
        isEnabled={hasSuggestionForField(draggableField)}
        dropOntoWorkspace={dropOntoWorkspace}
        field={draggableField}
      />
      {editField && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.lens.indexPattern.editFieldLabel', {
              defaultMessage: 'Edit data view field',
            })}
          >
            <EuiButtonIcon
              onClick={() => editField(field.name)}
              iconType="pencil"
              data-test-subj="lnsFieldListPanelEdit"
              aria-label={i18n.translate('xpack.lens.indexPattern.editFieldLabel', {
                defaultMessage: 'Edit data view field',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {removeField && field.runtime && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.lens.indexPattern.removeFieldLabel', {
              defaultMessage: 'Remove data view field',
            })}
          >
            <EuiButtonIcon
              onClick={() => removeField(field.name)}
              iconType="trash"
              data-test-subj="lnsFieldListPanelRemove"
              color="danger"
              aria-label={i18n.translate('xpack.lens.indexPattern.removeFieldLabel', {
                defaultMessage: 'Remove data view field',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function FieldItemPopoverContents(props: State & FieldItemProps) {
  const {
    histogram,
    topValues,
    indexPattern,
    field,
    dateRange,
    core,
    sampledValues,
    chartsThemeService,
    fieldFormats,
    dropOntoWorkspace,
    editField,
    removeField,
    hasSuggestionForField,
    hideDetails,
    uiActions,
  } = props;

  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  let histogramDefault = !!props.histogram;

  const totalValuesCount =
    topValues && topValues.buckets.reduce((prev, bucket) => bucket.count + prev, 0);
  const otherCount = sampledValues && totalValuesCount ? sampledValues - totalValuesCount : 0;

  if (
    totalValuesCount &&
    histogram &&
    histogram.buckets.length &&
    topValues &&
    topValues.buckets.length
  ) {
    // Default to histogram when top values are less than 10% of total
    histogramDefault = otherCount / totalValuesCount > 0.9;
  }

  const [showingHistogram, setShowingHistogram] = useState(histogramDefault);

  const panelHeader = (
    <FieldPanelHeader
      indexPatternId={indexPattern.id}
      field={field}
      dropOntoWorkspace={dropOntoWorkspace}
      hasSuggestionForField={hasSuggestionForField}
      editField={editField}
      removeField={removeField}
    />
  );

  if (hideDetails) {
    return panelHeader;
  }

  let formatter: { convert: (data: unknown) => string };
  if (indexPattern.fieldFormatMap && indexPattern.fieldFormatMap[field.name]) {
    const FormatType = fieldFormats.getType(indexPattern.fieldFormatMap[field.name].id);
    if (FormatType) {
      formatter = new FormatType(
        indexPattern.fieldFormatMap[field.name].params,
        core.uiSettings.get.bind(core.uiSettings)
      );
    } else {
      formatter = { convert: (data: unknown) => JSON.stringify(data) };
    }
  } else {
    formatter = fieldFormats.getDefaultInstance(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );
  }

  const fromDate = DateMath.parse(dateRange.fromDate);
  const toDate = DateMath.parse(dateRange.toDate);

  let title = <></>;

  if (props.isLoading) {
    return <EuiLoadingSpinner />;
  } else if (field.type.includes('range')) {
    return (
      <>
        <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>

        <EuiText size="s">
          {i18n.translate('xpack.lens.indexPattern.fieldStatsLimited', {
            defaultMessage: `Summary information is not available for range type fields.`,
          })}
        </EuiText>
      </>
    );
  } else if (field.type === 'murmur3') {
    return (
      <>
        <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>

        <EuiText size="s">
          {i18n.translate('xpack.lens.indexPattern.fieldStatsMurmur3Limited', {
            defaultMessage: `Summary information is not available for murmur3 fields.`,
          })}
        </EuiText>
      </>
    );
  } else if (field.type === 'geo_point' || field.type === 'geo_shape') {
    return (
      <>
        <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>

        <EuiText size="s">{getVisualizeGeoFieldMessage(field.type)}</EuiText>

        <EuiSpacer size="m" />
        <VisualizeGeoFieldButton
          uiActions={uiActions}
          indexPatternId={indexPattern.id}
          fieldName={field.name}
        />
      </>
    );
  } else if (
    (!props.histogram || props.histogram.buckets.length === 0) &&
    (!props.topValues || props.topValues.buckets.length === 0)
  ) {
    const isUsingSampling = core.uiSettings.get('lens:useFieldExistenceSampling');
    return (
      <>
        <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>

        <EuiText size="s">
          {isUsingSampling
            ? i18n.translate('xpack.lens.indexPattern.fieldStatsSamplingNoData', {
                defaultMessage:
                  'Lens is unable to create visualizations with this field because it does not contain data in the first 500 documents that match your filters. To create a visualization, drag and drop a different field.',
              })
            : i18n.translate('xpack.lens.indexPattern.fieldStatsNoData', {
                defaultMessage:
                  'Lens is unable to create visualizations with this field because it does not contain data. To create a visualization, drag and drop a different field.',
              })}
        </EuiText>
      </>
    );
  }

  if (histogram && histogram.buckets.length && topValues && topValues.buckets.length) {
    title = (
      <EuiButtonGroup
        className="lnsFieldItem__buttonGroup"
        buttonSize="compressed"
        isFullWidth
        legend={i18n.translate('xpack.lens.indexPattern.fieldStatsDisplayToggle', {
          defaultMessage: 'Toggle either the',
        })}
        options={[
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
              defaultMessage: 'Top values',
            }),
            id: 'topValues',
          },
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldDistributionLabel', {
              defaultMessage: 'Distribution',
            }),
            id: 'histogram',
          },
        ]}
        onChange={(optionId: string) => {
          setShowingHistogram(optionId === 'histogram');
        }}
        idSelected={showingHistogram ? 'histogram' : 'topValues'}
      />
    );
  } else if (field.type === 'date') {
    title = (
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.lens.indexPattern.fieldTimeDistributionLabel', {
            defaultMessage: 'Time distribution',
          })}
        </h6>
      </EuiTitle>
    );
  } else if (topValues && topValues.buckets.length) {
    title = (
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
            defaultMessage: 'Top values',
          })}
        </h6>
      </EuiTitle>
    );
  }

  function wrapInPopover(el: React.ReactElement) {
    return (
      <>
        <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>

        {title ? title : <></>}

        <EuiSpacer size="s" />

        {el}

        {props.totalDocuments ? (
          <EuiPopoverFooter>
            <EuiText color="subdued" size="xs">
              {props.sampledDocuments && (
                <>
                  {i18n.translate('xpack.lens.indexPattern.percentageOfLabel', {
                    defaultMessage: '{percentage}% of',
                    values: {
                      percentage: Math.round((props.sampledDocuments / props.totalDocuments) * 100),
                    },
                  })}
                </>
              )}{' '}
              <strong>
                {fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(props.totalDocuments)}
              </strong>{' '}
              {i18n.translate('xpack.lens.indexPattern.ofDocumentsLabel', {
                defaultMessage: 'documents',
              })}
            </EuiText>
          </EuiPopoverFooter>
        ) : (
          <></>
        )}
      </>
    );
  }

  if (histogram && histogram.buckets.length) {
    const specId = i18n.translate('xpack.lens.indexPattern.fieldStatsCountLabel', {
      defaultMessage: 'Count',
    });

    if (field.type === 'date') {
      return wrapInPopover(
        <Chart data-test-subj="lnsFieldListPanel-histogram" size={{ height: 200, width: 300 - 32 }}>
          <Settings
            tooltip={{ type: TooltipType.None }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            xDomain={
              fromDate && toDate
                ? {
                    min: fromDate.valueOf(),
                    max: toDate.valueOf(),
                    minInterval: Math.round((toDate.valueOf() - fromDate.valueOf()) / 10),
                  }
                : undefined
            }
          />

          <Axis
            id="key"
            position={Position.Bottom}
            tickFormat={
              fromDate && toDate
                ? niceTimeFormatter([fromDate.valueOf(), toDate.valueOf()])
                : undefined
            }
            showOverlappingTicks={true}
          />

          <HistogramBarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            timeZone="local"
          />
        </Chart>
      );
    } else if (showingHistogram || !topValues || !topValues.buckets.length) {
      return wrapInPopover(
        <Chart data-test-subj="lnsFieldListPanel-histogram" size={{ height: 200, width: '100%' }}>
          <Settings
            rotation={90}
            tooltip={{ type: TooltipType.None }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
          />

          <Axis
            id="key"
            position={Position.Left}
            showOverlappingTicks={true}
            tickFormat={(d) => formatter.convert(d)}
          />

          <HistogramBarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      );
    }
  }

  if (props.topValues && props.topValues.buckets.length) {
    const digitsRequired = props.topValues.buckets.some(
      (topValue) => !Number.isInteger(topValue.count / props.sampledValues!)
    );
    return wrapInPopover(
      <div data-test-subj="lnsFieldListPanel-topValues">
        {props.topValues.buckets.map((topValue) => {
          const formatted = formatter.convert(topValue.key);
          return (
            <div className="lnsFieldItem__topValue" key={topValue.key}>
              <EuiFlexGroup
                alignItems="stretch"
                key={topValue.key}
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={true} className="eui-textTruncate">
                  {formatted === '' ? (
                    <EuiText size="xs" color="subdued">
                      <em>
                        {i18n.translate('xpack.lens.indexPattern.fieldPanelEmptyStringValue', {
                          defaultMessage: 'Empty string',
                        })}
                      </em>
                    </EuiText>
                  ) : (
                    <EuiToolTip content={formatted} delay="long">
                      <EuiText size="xs" color="subdued" className="eui-textTruncate">
                        {formatted}
                      </EuiText>
                    </EuiToolTip>
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" textAlign="left" color="accent">
                    {(Math.round((topValue.count / props.sampledValues!) * 1000) / 10).toFixed(
                      digitsRequired ? 1 : 0
                    )}
                    %
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiProgress
                className="lnsFieldItem__topValueProgress"
                value={topValue.count / props.sampledValues!}
                max={1}
                size="s"
                color="accent"
              />
            </div>
          );
        })}
        {otherCount ? (
          <>
            <EuiFlexGroup alignItems="stretch" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={true} className="eui-textTruncate">
                <EuiText size="xs" className="eui-textTruncate" color="subdued">
                  {i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
                    defaultMessage: 'Other',
                  })}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiText size="xs" color="subdued">
                  {(Math.round((otherCount / props.sampledValues!) * 1000) / 10).toFixed(
                    digitsRequired ? 1 : 0
                  )}
                  %
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiProgress
              className="lnsFieldItem__topValueProgress"
              value={otherCount / props.sampledValues!}
              max={1}
              size="s"
              color="subdued"
            />
          </>
        ) : (
          <></>
        )}
      </div>
    );
  }
  return <></>;
}

const DragToWorkspaceButton = ({
  field,
  dropOntoWorkspace,
  isEnabled,
}: {
  field: DraggedField;
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  isEnabled: boolean;
}) => {
  const buttonTitle = isEnabled
    ? i18n.translate('xpack.lens.indexPattern.moveToWorkspace', {
        defaultMessage: 'Add {field} to workspace',
        values: {
          field: field.field.name,
        },
      })
    : i18n.translate('xpack.lens.indexPattern.moveToWorkspaceDisabled', {
        defaultMessage:
          "This field can't be added to the workspace automatically. You can still use it directly in the configuration panel.",
      });

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={buttonTitle}>
        <EuiButtonIcon
          aria-label={buttonTitle}
          isDisabled={!isEnabled}
          iconType="plusInCircle"
          onClick={() => {
            dropOntoWorkspace(field);
          }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};
