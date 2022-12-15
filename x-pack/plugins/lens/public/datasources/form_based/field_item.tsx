/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_item.scss';

import React, { useCallback, useState, useMemo } from 'react';
import { EuiIconTip, EuiText, EuiButton, EuiPopoverFooter } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FieldButton } from '@kbn/react-field';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { EuiHighlight } from '@elastic/eui';
import { Filter, Query } from '@kbn/es-query';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/common';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  AddFieldFilterHandler,
  FieldStats,
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverVisualize,
  FieldIcon,
  getFieldIconProps,
  wrapFieldNameOnDot,
} from '@kbn/unified-field-list-plugin/public';
import { generateFilters, getEsQueryConfig } from '@kbn/data-plugin/public';
import { DragDrop } from '../../drag_drop';
import { DatasourceDataPanelProps } from '../../types';
import { DOCUMENT_FIELD_NAME } from '../../../common';
import type { IndexPattern, IndexPatternField } from '../../types';
import type { LensAppServices } from '../../app_plugin/types';
import { APP_ID } from '../../../common/constants';
import { combineQueryAndFilters } from '../../app_plugin/show_underlying_data';

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

export const InnerFieldItem = function InnerFieldItem(props: FieldItemProps) {
  const {
    field,
    indexPattern,
    highlight,
    exists,
    hideDetails,
    itemIndex,
    groupIndex,
    dropOntoWorkspace,
    hasSuggestionForField,
    editField,
    removeField,
  } = props;

  const dataViewField = useMemo(() => new DataViewField(field), [field]);
  const services = useKibana<LensAppServices>().services;
  const filterManager = services?.data?.query?.filterManager;
  const [infoIsOpen, setOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const addFilterAndClose: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager
        ? (clickedField, values, operation) => {
            closePopover();
            const newFilters = generateFilters(
              filterManager,
              clickedField,
              values,
              operation,
              indexPattern
            );
            filterManager.addFilters(newFilters);
          }
        : undefined,
    [indexPattern, filterManager, closePopover]
  );

  const editFieldAndClose = useMemo(
    () =>
      editField && dataViewField.name !== DOCUMENT_FIELD_NAME
        ? (name: string) => {
            closePopover();
            editField(name);
          }
        : undefined,
    [editField, closePopover, dataViewField.name]
  );

  const removeFieldAndClose = useMemo(
    () =>
      removeField
        ? (name: string) => {
            closePopover();
            removeField(name);
          }
        : undefined,
    [removeField, closePopover]
  );

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

  const dropOntoWorkspaceAndClose = useCallback(() => {
    closePopover();
    dropOntoWorkspace(value);
  }, [dropOntoWorkspace, closePopover, value]);

  const onDragStart = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const lensFieldIcon = <FieldIcon {...getFieldIconProps(field)} />;
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
      <FieldPopover
        isOpen={infoIsOpen}
        closePopover={closePopover}
        panelClassName="lnsFieldItem__fieldPanel"
        initialFocus=".lnsFieldItem__fieldPanel"
        className="lnsFieldItem__popoverAnchor"
        data-test-subj="lnsFieldListPanelField"
        panelProps={{
          'data-test-subj': 'lnsFieldListPanelFieldContent',
        }}
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
                <EuiHighlight search={wrapFieldNameOnDot(highlight)}>
                  {wrapFieldNameOnDot(field.displayName)}
                </EuiHighlight>
              }
              fieldInfoIcon={lensInfoIcon}
            />
          </DragDrop>
        }
        renderHeader={() => {
          const canAddToWorkspace = hasSuggestionForField(value);
          const buttonTitle = canAddToWorkspace
            ? i18n.translate('xpack.lens.indexPattern.moveToWorkspace', {
                defaultMessage: 'Add {field} to workspace',
                values: {
                  field: value.field.name,
                },
              })
            : i18n.translate('xpack.lens.indexPattern.moveToWorkspaceNotAvailable', {
                defaultMessage:
                  'To visualize this field, please add it directly to the desired layer. Adding this field to the workspace is not supported based on your current configuration.',
              });

          return (
            <FieldPopoverHeader
              field={dataViewField}
              closePopover={closePopover}
              buttonAddFieldToWorkspaceProps={{
                isDisabled: !canAddToWorkspace,
                'aria-label': buttonTitle,
              }}
              onAddFieldToWorkspace={dropOntoWorkspaceAndClose}
              onAddFilter={addFilterAndClose}
              onEditField={editFieldAndClose}
              onDeleteField={removeFieldAndClose}
            />
          );
        }}
        renderContent={
          !hideDetails
            ? () => (
                <FieldItemPopoverContents
                  {...props}
                  dataViewField={dataViewField}
                  onAddFilter={addFilterAndClose}
                />
              )
            : undefined
        }
      />
    </li>
  );
};

export const FieldItem = React.memo(InnerFieldItem);

function FieldItemPopoverContents(
  props: FieldItemProps & {
    dataViewField: DataViewField;
    onAddFilter: AddFieldFilterHandler | undefined;
  }
) {
  const { query, filters, indexPattern, dataViewField, dateRange, core, onAddFilter, uiActions } =
    props;
  const services = useKibana<LensAppServices>().services;

  const exploreInDiscover = useMemo(() => {
    const meta = {
      id: indexPattern.id,
      columns: [dataViewField.name],
      filters: {
        enabled: {
          lucene: [],
          kuery: [],
        },
        disabled: {
          lucene: [],
          kuery: [],
        },
      },
    };
    const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
      query,
      filters,
      meta,
      [indexPattern],
      getEsQueryConfig(services.uiSettings)
    );
    const discoverLocator = services.share?.url.locators.get('DISCOVER_APP_LOCATOR');
    if (!discoverLocator || !services.application.capabilities.discover.show) {
      return;
    }
    return discoverLocator.getRedirectUrl({
      dataViewSpec: indexPattern?.spec,
      timeRange: services.data.query.timefilter.timefilter.getTime(),
      filters: newFilters,
      query: newQuery,
      columns: meta.columns,
    });
  }, [dataViewField.name, filters, indexPattern, query, services]);

  return (
    <>
      <FieldStats
        services={services}
        query={query}
        filters={filters}
        fromDate={dateRange.fromDate}
        toDate={dateRange.toDate}
        dataViewOrDataViewId={indexPattern.id} // TODO: Refactor to pass a variable with DataView type instead of IndexPattern
        onAddFilter={onAddFilter}
        field={dataViewField}
        data-test-subj="lnsFieldListPanel"
        overrideMissingContent={(params) => {
          if (params.reason === 'no-data') {
            // TODO: should we replace this with a default message "Analysis is not available for this field?"
            const isUsingSampling = core.uiSettings.get('lens:useFieldExistenceSampling');
            return (
              <EuiText size="s" data-test-subj="lnsFieldListPanel-missingFieldStats">
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
            );
          }
          if (params.reason === 'unsupported') {
            return (
              <EuiText data-test-subj="lnsFieldListPanel-missingFieldStats">
                {params.element}
              </EuiText>
            );
          }
          return params.element;
        }}
      />

      {dataViewField.type === 'geo_point' || dataViewField.type === 'geo_shape' ? (
        <FieldPopoverVisualize
          field={dataViewField}
          dataView={{ ...indexPattern, toSpec: () => indexPattern.spec } as unknown as DataView}
          originatingApp={APP_ID}
          uiActions={uiActions}
          buttonProps={{
            'data-test-subj': `lensVisualize-GeoField-${dataViewField.name}`,
          }}
        />
      ) : exploreInDiscover ? (
        <EuiPopoverFooter>
          <EuiButton
            fullWidth
            size="s"
            href={exploreInDiscover}
            target="_blank"
            data-test-subj={`lnsFieldListPanel-exploreInDiscover-${dataViewField.name}`}
          >
            {i18n.translate('xpack.lens.indexPattern.fieldExploreInDiscover', {
              defaultMessage: 'Explore in Discover',
            })}
          </EuiButton>
        </EuiPopoverFooter>
      ) : null}
    </>
  );
}
