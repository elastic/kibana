/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React, { MutableRefObject, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTabs,
  EuiTab,
  EuiCallOut,
  EuiIconTip,
  EuiSelect,
  EuiButtonGroup,
  htmlIdGenerator,
  EuiButtonEmpty,
} from '@elastic/eui';
import { GenericIndexPatternColumn, operationDefinitionMap } from '../operations';
import { TooltipWrapper, useDebouncedValue } from '../../shared_components';
import { isSortableByColumn } from '../pure_utils';
import type { Datatable } from '../../../../../../src/plugins/expressions/public';
import type { IndexPatternLayer } from '../types';
import type { SortOverrideType } from '../operations/definitions/column_types';
import { StackedPanelContainer } from '../../shared_components/stacked_panel_container';
import { getTermsList, getTopTerms, TermsList } from './terms_list_panel';

const generateId = htmlIdGenerator();

const idPrefix = generateId();

export const formulaOperationName = 'formula';
export const staticValueOperationName = 'static_value';
export const quickFunctionsName = 'quickFunctions';
export const nonQuickFunctions = new Set([formulaOperationName, staticValueOperationName]);

export type TemporaryState = typeof quickFunctionsName | typeof staticValueOperationName | 'none';

export function isQuickFunction(operationType: string) {
  return !nonQuickFunctions.has(operationType);
}

type CurrentSortingType = Pick<SortOverrideType, 'type' | 'columnId'> &
  Partial<Pick<SortOverrideType, 'direction' | 'terms'>>;

const SEPARATOR = '$$$';
const TERMS_LIMIT = 10;
const TERMS_INIT_LIMIT = 3;

export const SortingCriteria = ({
  layer,
  currentColumn,
  columnId,
  layerId,
  activeData,
  onChange,
  panelRef,
}: {
  layer: IndexPatternLayer;
  currentColumn: GenericIndexPatternColumn;
  columnId: string;
  layerId: string;
  activeData?: Record<string, Datatable>;
  onChange: (value: SortOverrideType) => void;
  panelRef: MutableRefObject<HTMLDivElement | null>;
}) => {
  const [isTermsPanelOpen, setTermsPanelOpen] = useState(false);
  function toValue(orderBy: Partial<GenericIndexPatternColumn['sortOverride']>) {
    if (!orderBy) {
      return 'none';
    }
    if (orderBy.type !== 'column') {
      return orderBy.type;
    }
    return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
  }

  function fromValue(type: string): Pick<SortOverrideType, 'type' | 'columnId'> {
    if (type === 'alphabetical' || type === 'none' || type === 'terms') {
      return {
        type,
        columnId,
      };
    }
    const parts = type.split(SEPARATOR);
    return {
      type: 'column',
      columnId: parts[1],
    };
  }

  const sortOverrideOptions = Object.entries(layer.columns)
    // TODO: use the visualization groups accessor here to replace some checks
    .filter(([sortId]) => isSortableByColumn(layer, sortId, true))
    .map(([sortId, column]) => {
      return {
        value: toValue({ type: 'column', columnId: sortId }),
        text: column.label,
      };
    });
  sortOverrideOptions.push(
    {
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.sortOverrideAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    },
    {
      value: toValue({ type: 'none' }),
      text: i18n.translate('xpack.lens.indexPattern.sortOverrideNone', {
        defaultMessage: 'None',
      }),
    }
  );

  if (currentColumn.operationType === 'terms') {
    sortOverrideOptions.push({
      value: toValue({ type: 'terms' }),
      text: i18n.translate('xpack.lens.indexPattern.sortOverrideTerms', {
        defaultMessage: 'List of terms',
      }),
    });
  }

  const currentSortOverride: CurrentSortingType = currentColumn.sortOverride ?? {
    ...fromValue('none'),
  };

  const termsList = getTermsList(activeData?.[layerId], columnId);
  const currentTermsList = currentSortOverride.terms ?? getTopTerms(termsList, TERMS_INIT_LIMIT);
  const currentSortDirection =
    currentSortOverride.direction || (currentSortOverride.type === 'column' ? 'desc' : 'asc');
  return (
    <>
      <EuiFormRow
        label={
          <>
            {i18n.translate('xpack.lens.indexPattern.sortOverride', {
              defaultMessage: 'Sort override',
            })}{' '}
            <EuiIconTip
              color="subdued"
              content={i18n.translate('xpack.lens.indexPattern.sortOverrideHelp', {
                defaultMessage: `Specifies a sort override for the dimension in the chart.`,
              })}
              iconProps={{
                className: 'eui-alignTop',
              }}
              position="top"
              size="s"
              type="questionInCircle"
            />
          </>
        }
        helpText={
          <span style={{ float: 'right' }}>
            <TooltipWrapper
              tooltipContent={i18n.translate('xpack.lens.indexPattern.terms.deleteButtonDisabled', {
                defaultMessage: 'This function requires a minimum of one term defined',
              })}
              condition={currentSortOverride.type !== 'terms'}
            >
              <EuiButtonEmpty
                data-test-subj="lns_indexpattern_terms_panel_trigger"
                iconType="controlsHorizontal"
                onClick={() => {
                  setTermsPanelOpen(!isTermsPanelOpen);
                }}
                size="xs"
                flush="both"
                disabled={currentSortOverride.type !== 'terms'}
              >
                {i18n.translate('xpack.lens.paletteTableGradient.customize', {
                  defaultMessage: 'Edit List',
                })}
              </EuiButtonEmpty>
            </TooltipWrapper>
          </span>
        }
        display="columnCompressed"
        fullWidth
      >
        <EuiSelect
          compressed
          data-test-subj="indexPattern-sort-override"
          options={sortOverrideOptions}
          value={toValue(currentSortOverride)}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const newSortingOverride = fromValue(e.target.value);
            onChange({
              ...newSortingOverride,
              direction: newSortingOverride.type === 'none' ? undefined : currentSortDirection,
              terms: newSortingOverride.type === 'terms' ? currentTermsList : undefined,
            });
          }}
          aria-label={i18n.translate('xpack.lens.indexPattern.sortOverride', {
            defaultMessage: 'Sort override',
          })}
        />
      </EuiFormRow>
      {currentSortOverride.type !== 'none' && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.sortOverrideDirection', {
            defaultMessage: 'Sort direction',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.indexPattern.sortDirection', {
              defaultMessage: 'Sort direction',
            })}
            data-test-subj="indexPattern-sortDirection-groups"
            name="sortDirection"
            buttonSize="compressed"
            aria-label={i18n.translate('xpack.lens.indexPattern.sortDirection', {
              defaultMessage: 'Sort direction',
            })}
            options={[
              {
                id: `${idPrefix}asc`,
                'data-test-subj': 'indexPattern-sortDirection-groups-asc',
                value: 'asc',
                label: i18n.translate('xpack.lens.indexPattern.sortAscending', {
                  defaultMessage: 'Ascending',
                }),
              },
              {
                id: `${idPrefix}desc`,
                'data-test-subj': 'indexPattern-sortDirection-groups-desc',
                value: 'desc',
                label: i18n.translate('xpack.lens.indexPattern.sortDescending', {
                  defaultMessage: 'Descending',
                }),
              },
            ]}
            idSelected={`${idPrefix}${currentSortDirection}`}
            onChange={(id) => {
              const value = id.replace(idPrefix, '') as SortOverrideType['direction'];
              onChange({
                ...(currentColumn.sortOverride ?? fromValue('none')),
                direction: value,
              });
            }}
          />
        </EuiFormRow>
      )}
      <StackedPanelContainer
        siblingRef={panelRef}
        isOpen={isTermsPanelOpen && currentSortOverride.type === 'terms'}
        handleClose={() => setTermsPanelOpen(!isTermsPanelOpen)}
        idPrefix={'TermsPanel'}
        title={i18n.translate('xpack.lens.indexPattern.sortOverrideTermsList', {
          defaultMessage: 'Terms list',
        })}
      >
        <TermsList
          termsList={currentTermsList}
          availableTerms={termsList}
          limit={TERMS_LIMIT}
          setTermsList={(newTerms) => {
            onChange({
              ...currentColumn.sortOverride!,
              direction: currentSortDirection,
              terms: newTerms,
            });
          }}
        />
      </StackedPanelContainer>
    </>
  );
};

export const LabelInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { inputValue, handleInputChange, initialValue } = useDebouncedValue({ onChange, value });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
        defaultMessage: 'Display name',
        description: 'Display name of a column of data',
      })}
      display="columnCompressed"
      fullWidth
    >
      <EuiFieldText
        compressed
        data-test-subj="indexPattern-label-edit"
        value={inputValue}
        onChange={(e) => {
          handleInputChange(e.target.value);
        }}
        placeholder={initialValue}
      />
    </EuiFormRow>
  );
};

export function getParamEditor(
  temporaryStaticValue: boolean,
  selectedOperationDefinition: typeof operationDefinitionMap[string] | undefined,
  showDefaultStaticValue: boolean
) {
  if (temporaryStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  if (selectedOperationDefinition?.paramEditor) {
    return selectedOperationDefinition.paramEditor;
  }
  if (showDefaultStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  return null;
}

export const CalloutWarning = ({
  currentOperationType,
  temporaryStateType,
}: {
  currentOperationType: keyof typeof operationDefinitionMap | undefined;
  temporaryStateType: TemporaryState;
}) => {
  if (
    temporaryStateType === 'none' ||
    (currentOperationType != null && isQuickFunction(currentOperationType))
  ) {
    return null;
  }
  if (
    currentOperationType === staticValueOperationName &&
    temporaryStateType === 'quickFunctions'
  ) {
    return (
      <>
        <EuiCallOut
          className="lnsIndexPatternDimensionEditor__warning"
          size="s"
          title={i18n.translate('xpack.lens.indexPattern.staticValueWarning', {
            defaultMessage: 'Static value currently applied',
          })}
          iconType="alert"
          color="warning"
        >
          <p>
            {i18n.translate('xpack.lens.indexPattern.staticValueWarningText', {
              defaultMessage: 'To overwrite your static value, select a quick function',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }
  return (
    <>
      <EuiCallOut
        className="lnsIndexPatternDimensionEditor__warning"
        size="s"
        title={i18n.translate('xpack.lens.indexPattern.formulaWarning', {
          defaultMessage: 'Formula currently applied',
        })}
        iconType="alert"
        color="warning"
      >
        {temporaryStateType !== 'quickFunctions' ? (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningStaticValueText', {
              defaultMessage: 'To overwrite your formula, change the value in the input field',
            })}
          </p>
        ) : (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningText', {
              defaultMessage: 'To overwrite your formula, select a quick function',
            })}
          </p>
        )}
      </EuiCallOut>
    </>
  );
};

export interface DimensionEditorTab {
  enabled: boolean;
  state: boolean;
  onClick: () => void;
  id: typeof quickFunctionsName | typeof staticValueOperationName | typeof formulaOperationName;
  label: string;
}

export const DimensionEditorTabs = ({ tabs }: { tabs: DimensionEditorTab[] }) => {
  return (
    <EuiTabs
      size="s"
      className="lnsIndexPatternDimensionEditor__header"
      data-test-subj="lens-dimensionTabs"
    >
      {tabs.map(({ id, enabled, state, onClick, label }) => {
        return enabled ? (
          <EuiTab
            key={id}
            isSelected={state}
            data-test-subj={`lens-dimensionTabs-${id}`}
            onClick={onClick}
          >
            {label}
          </EuiTab>
        ) : null;
      })}
    </EuiTabs>
  );
};
