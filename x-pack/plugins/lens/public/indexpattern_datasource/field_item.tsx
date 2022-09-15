/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_item.scss';

import React, { useCallback, useState, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FieldButton } from '@kbn/react-field';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { EuiHighlight } from '@elastic/eui';
import { Filter, Query } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldStats } from '@kbn/unified-field-list-plugin/public';
import { DragDrop, DragDropIdentifier } from '../drag_drop';
import { DatasourceDataPanelProps, DataType } from '../types';
import { DOCUMENT_FIELD_NAME } from '../../common';
import type { IndexPattern, IndexPatternField } from '../types';
import type { DraggedField } from './types';
import { LensFieldIcon } from '../shared_components/field_picker/lens_field_icon';
import { VisualizeGeoFieldButton } from './visualize_geo_field_button';
import { getVisualizeGeoFieldMessage } from '../utils';
import type { LensAppServices } from '../app_plugin/types';
import { debouncedComponent } from '../debounced_component';
import { getFieldType } from './pure_utils';

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

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
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

  function togglePopover() {
    setOpen(!infoIsOpen);
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

  const lensFieldIcon = <LensFieldIcon type={getFieldType(field) as DataType} />;
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
        {infoIsOpen && (
          <FieldItemPopoverContents
            {...props}
            editField={closeAndEdit}
            removeField={closeAndRemove}
            dropOntoWorkspace={dropOntoWorkspaceAndClose}
          />
        )}
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
      {editField && field.name !== DOCUMENT_FIELD_NAME && (
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

function FieldItemPopoverContents(props: FieldItemProps) {
  const {
    query,
    filters,
    indexPattern,
    field,
    dateRange,
    dropOntoWorkspace,
    editField,
    removeField,
    hasSuggestionForField,
    hideDetails,
    uiActions,
    core,
  } = props;
  const services = useKibana<LensAppServices>().services;

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

  return (
    <>
      <EuiPopoverTitle>{panelHeader}</EuiPopoverTitle>
      <FieldStats
        services={services}
        query={query}
        filters={filters}
        fromDate={dateRange.fromDate}
        toDate={dateRange.toDate}
        dataViewOrDataViewId={indexPattern.id} // TODO: Refactor to pass a variable with DataView type instead of IndexPattern
        field={field as DataViewField}
        data-test-subj="lnsFieldListPanel"
        overrideFooter={({ element }) => <EuiPopoverFooter>{element}</EuiPopoverFooter>}
        overrideMissingContent={(params) => {
          if (field.type === 'geo_point' || field.type === 'geo_shape') {
            return (
              <>
                <EuiText size="s">{getVisualizeGeoFieldMessage(field.type)}</EuiText>

                <EuiSpacer size="m" />
                <VisualizeGeoFieldButton
                  uiActions={uiActions}
                  indexPattern={indexPattern}
                  fieldName={field.name}
                />
              </>
            );
          }

          if (params?.noDataFound) {
            const isUsingSampling = core.uiSettings.get('lens:useFieldExistenceSampling');
            return (
              <>
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

          return null;
        }}
      />
    </>
  );
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
