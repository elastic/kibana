/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_item.scss';

import React, { useCallback, useState, useMemo } from 'react';
import { EuiText, EuiButton, EuiPopoverFooter } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
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
  FieldItemButton,
} from '@kbn/unified-field-list-plugin/public';
import { DragDrop } from '@kbn/dom-drag-drop';
import { generateFilters, getEsQueryConfig } from '@kbn/data-plugin/public';
import { DatasourceDataPanelProps } from '../../types';
import { DOCUMENT_FIELD_NAME } from '../../../common';
import type { IndexPattern, IndexPatternField } from '../../types';
import type { LensAppServices } from '../../app_plugin/types';
import { APP_ID } from '../../../common/constants';
import { combineQueryAndFilters } from '../../app_plugin/show_underlying_data';
import { getFieldItemActions } from '../common/get_field_item_actions';

export interface FieldItemProps {
  isSelected: boolean;
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
    isSelected,
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

  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const { buttonAddFieldToWorkspaceProps, onAddFieldToWorkspace } =
    getFieldItemActions<IndexPatternField>({
      value,
      hasSuggestionForField,
      dropOntoWorkspace,
      closeFieldPopover: closePopover,
    });

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
            withDragHandle
            order={order}
            value={value}
            dataTestSubj={`lnsFieldListPanelField-${field.name}`}
            onDragStart={closePopover}
          >
            <FieldItemButton<IndexPatternField>
              isSelected={isSelected}
              isEmpty={!exists}
              isActive={infoIsOpen}
              field={field}
              fieldSearchHighlight={highlight}
              onClick={togglePopover}
              buttonAddFieldToWorkspaceProps={buttonAddFieldToWorkspaceProps}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
            />
          </DragDrop>
        }
        renderHeader={() => {
          return (
            <FieldPopoverHeader
              field={dataViewField}
              closePopover={closePopover}
              buttonAddFieldToWorkspaceProps={buttonAddFieldToWorkspaceProps}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
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
  const { query, filters, indexPattern, dataViewField, dateRange, onAddFilter, uiActions } = props;
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
            return (
              <EuiText size="s" data-test-subj="lnsFieldListPanel-missingFieldStats">
                {i18n.translate('xpack.lens.indexPattern.fieldStatsNoData', {
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
