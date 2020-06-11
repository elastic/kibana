/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq, indexBy } from 'lodash';
import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  // @ts-ignore
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverTitle,
  EuiButton,
  EuiCallOut,
  EuiFormControlLayout,
  EuiNotificationBadge,
  EuiSpacer,
  EuiFormLabel,
  EuiAccordion,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { FieldItem } from './field_item';
import {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternRef,
} from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { syncExistingFields } from './loader';
import { fieldExists } from './pure_helpers';
import { Loader } from '../loader';
import { esQuery, IIndexPattern } from '../../../../../src/plugins/data/public';

export type Props = DatasourceDataPanelProps<IndexPatternPrivateState> & {
  data: DataPublicPluginStart;
  changeIndexPattern: (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState>
  ) => void;
};
import { LensFieldIcon } from './lens_field_icon';
import { ChangeIndexPattern } from './change_indexpattern';

// TODO the typings for EuiContextMenuPanel are incorrect - watchedItemProps is missing. This can be removed when the types are adjusted
const FixedEuiContextMenuPanel = (EuiContextMenuPanel as unknown) as React.FunctionComponent<
  EuiContextMenuPanelProps & { watchedItemProps: string[] }
>;

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name.localeCompare(fieldB.name, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = new Set(['string', 'number', 'boolean', 'date', 'ip', 'document']);
const PAGINATION_SIZE = 50;

const fieldTypeNames: Record<DataType, string> = {
  document: i18n.translate('xpack.lens.datatypes.record', { defaultMessage: 'record' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP' }),
};

export function IndexPatternDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
  changeIndexPattern,
}: Props) {
  const { indexPatternRefs, indexPatterns, currentIndexPatternId } = state;

  const onChangeIndexPattern = useCallback(
    (id: string) => changeIndexPattern(id, state, setState),
    [state, setState]
  );

  const indexPatternList = uniq(
    Object.values(state.layers)
      .map((l) => l.indexPatternId)
      .concat(currentIndexPatternId)
  )
    .sort((a, b) => a.localeCompare(b))
    .filter((id) => !!indexPatterns[id])
    .map((id) => ({
      id,
      title: indexPatterns[id].title,
      timeFieldName: indexPatterns[id].timeFieldName,
    }));

  const dslQuery = esQuery.buildEsQuery(
    indexPatterns[currentIndexPatternId] as IIndexPattern,
    query,
    filters,
    esQuery.getEsQueryConfig(core.uiSettings)
  );

  return (
    <>
      <Loader
        load={() =>
          syncExistingFields({
            dateRange,
            setState,
            indexPatterns: indexPatternList,
            fetchJson: core.http.post,
            dslQuery,
          })
        }
        loadDeps={[
          query,
          filters,
          dateRange.fromDate,
          dateRange.toDate,
          indexPatternList.map((x) => `${x.title}:${x.timeFieldName}`).join(','),
        ]}
      />

      {Object.keys(indexPatterns).length === 0 ? (
        <EuiFlexGroup
          gutterSize="m"
          className="lnsInnerIndexPatternDataPanel"
          direction="column"
          responsive={false}
        >
          <EuiFlexItem grow={null}>
            <EuiCallOut
              data-test-subj="indexPattern-no-indexpatterns"
              title={i18n.translate('xpack.lens.indexPattern.noPatternsLabel', {
                defaultMessage: 'No index patterns',
              })}
              color="warning"
              iconType="alert"
            >
              <p>
                <FormattedMessage
                  id="xpack.lens.indexPattern.noPatternsDescription"
                  defaultMessage="Please create an index pattern or switch to another data source"
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MemoizedDataPanel
          currentIndexPatternId={currentIndexPatternId}
          indexPatternRefs={indexPatternRefs}
          indexPatterns={indexPatterns}
          query={query}
          dateRange={dateRange}
          filters={filters}
          dragDropContext={dragDropContext}
          core={core}
          data={data}
          onChangeIndexPattern={onChangeIndexPattern}
          existingFields={state.existingFields}
        />
      )}
    </>
  );
}

interface DataPanelState {
  nameFilter: string;
  typeFilter: DataType[];
  isTypeFilterOpen: boolean;
}

const fieldFiltersLabel = i18n.translate('xpack.lens.indexPatterns.fieldFiltersLabel', {
  defaultMessage: 'Field filters',
});

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatternRefs,
  indexPatterns,
  query,
  dateRange,
  filters,
  dragDropContext,
  onChangeIndexPattern,
  core,
  data,
  existingFields,
}: Pick<DatasourceDataPanelProps, Exclude<keyof DatasourceDataPanelProps, 'state' | 'setState'>> & {
  data: DataPublicPluginStart;
  currentIndexPatternId: string;
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  onChangeIndexPattern: (newId: string) => void;
  existingFields: IndexPatternPrivateState['existingFields'];
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
  });
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const allFields = currentIndexPattern.fields;
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '', typeFilter: [] }));

  const lazyScroll = () => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setPageSize(Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, allFields.length)));
      }
    }
  };

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
      lazyScroll();
    }
  }, [localState.nameFilter, localState.typeFilter, currentIndexPatternId]);

  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    (type) => type in fieldTypeNames
  );

  const filteredFields = allFields.filter((field) => {
    if (!supportedFieldTypes.has(field.type)) {
      return false;
    }

    if (
      localState.nameFilter.length &&
      !field.name.toLowerCase().includes(localState.nameFilter.toLowerCase())
    ) {
      return false;
    }

    if (localState.typeFilter.length > 0) {
      return localState.typeFilter.includes(field.type as DataType);
    }
    return true;
  });

  const containsData = (field: IndexPatternField) => {
    const fieldByName = indexBy(allFields, 'name');
    const overallField = fieldByName[field.name];
    return (
      overallField && fieldExists(existingFields, currentIndexPattern.title, overallField.name)
    );
  };

  const [specialFields, documentFields] = _.partition(filteredFields, (f) => f.type === 'document');

  const [availableFields, emptyFields] = _.partition(documentFields, containsData);

  const paginatedFields = [
    ...availableFields.sort(sortFields),
    ...emptyFields.sort(sortFields),
  ].slice(0, pageSize);

  const [paginatedAvailableFields, paginatedEmptyFields] = _.partition(
    paginatedFields,
    containsData
  );

  const hilight = localState.nameFilter.toLowerCase();

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={null}>
          <div className="lnsInnerIndexPatternDataPanel__header">
            <ChangeIndexPattern
              data-test-subj="indexPattern-switcher"
              trigger={{
                label: currentIndexPattern.title,
                title: currentIndexPattern.title,
                'data-test-subj': 'indexPattern-switch-link',
                className: 'lnsInnerIndexPatternDataPanel__triggerButton',
              }}
              indexPatternId={currentIndexPatternId}
              indexPatternRefs={indexPatternRefs}
              onChangeIndexPattern={(newId: string) => {
                onChangeIndexPattern(newId);
                clearLocalState();
              }}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <div className="lnsInnerIndexPatternDataPanel__filtersWrapper">
            <EuiPopover
              id="dataPanelTypeFilter"
              panelClassName="euiFilterGroup__popoverPanel"
              panelPaddingSize="none"
              anchorPosition="rightDown"
              display="block"
              isOpen={localState.isTypeFilterOpen}
              closePopover={() => setLocalState(() => ({ ...localState, isTypeFilterOpen: false }))}
              button={
                <EuiFlexItem grow={true}>
                  <EuiButton
                    data-test-subj="lnsIndexPatternFiltersToggle"
                    size="s"
                    onClick={() => {
                      setLocalState((s) => ({
                        ...s,
                        isTypeFilterOpen: !localState.isTypeFilterOpen,
                      }));
                    }}
                  >
                    {localState.typeFilter.length ? (
                      <>
                        {fieldFiltersLabel}{' '}
                        <EuiNotificationBadge size="m">
                          {localState.typeFilter.length}
                        </EuiNotificationBadge>
                      </>
                    ) : (
                      fieldFiltersLabel
                    )}
                  </EuiButton>
                  <EuiSpacer size="xs" />
                </EuiFlexItem>
              }
            >
              <EuiPopoverTitle>{fieldFiltersLabel}</EuiPopoverTitle>
              <FixedEuiContextMenuPanel
                watchedItemProps={['icon', 'disabled']}
                data-test-subj="lnsIndexPatternTypeFilterOptions"
                items={(availableFieldTypes as DataType[]).map((type) => (
                  <EuiContextMenuItem
                    className="lnsInnerIndexPatternDataPanel__filterType"
                    key={type}
                    icon={localState.typeFilter.includes(type) ? 'check' : 'empty'}
                    data-test-subj={`typeFilter-${type}`}
                    onClick={() => {
                      trackUiEvent('indexpattern_type_filter_toggled');
                      setLocalState((s) => ({
                        ...s,
                        typeFilter: localState.typeFilter.includes(type)
                          ? localState.typeFilter.filter((t) => t !== type)
                          : [...localState.typeFilter, type],
                      }));
                    }}
                  >
                    <span className="lnsInnerIndexPatternDataPanel__filterTypeInner">
                      <LensFieldIcon type={type} /> {fieldTypeNames[type]}
                    </span>
                  </EuiContextMenuItem>
                ))}
              />
            </EuiPopover>
          </div>

          <div className="lnsInnerIndexPatternDataPanel__filterWrapper">
            <EuiFormControlLayout
              icon="search"
              fullWidth
              clear={{
                title: i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                'aria-label': i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                onClick: () => {
                  trackUiEvent('indexpattern_filters_cleared');
                  clearLocalState();
                },
              }}
            >
              <input
                className="euiFieldText euiFieldText--fullWidth lnsInnerIndexPatternDataPanel__textField"
                data-test-subj="lnsIndexPatternFieldSearch"
                placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search field names',
                  description:
                    'Search the list of fields in the index pattern for the provided text',
                })}
                value={localState.nameFilter}
                onChange={(e) => {
                  setLocalState({ ...localState, nameFilter: e.target.value });
                }}
                aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameAriaLabel', {
                  defaultMessage: 'Search fields',
                })}
              />
            </EuiFormControlLayout>
          </div>
          <div
            className="lnsInnerIndexPatternDataPanel__listWrapper"
            ref={(el) => {
              if (el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={lazyScroll}
          >
            <div className="lnsInnerIndexPatternDataPanel__list">
              {specialFields.map((field) => (
                <FieldItem
                  core={core}
                  data={data}
                  key={field.name}
                  indexPattern={currentIndexPattern}
                  field={field}
                  highlight={hilight}
                  exists={paginatedFields.length > 0}
                  dateRange={dateRange}
                  query={query}
                  filters={filters}
                  hideDetails={true}
                />
              ))}

              <EuiSpacer size="s" />
              <EuiAccordion
                initialIsOpen={true}
                id="availableFieldsLabel"
                buttonContent={
                  <EuiFormLabel>
                    {i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
                      defaultMessage: 'Available fields',
                    })}
                  </EuiFormLabel>
                }
                extraAction={
                  <EuiNotificationBadge
                    size="m"
                    color={
                      localState.typeFilter.length || localState.nameFilter.length
                        ? 'accent'
                        : 'subdued'
                    }
                  >
                    {availableFields.length}
                  </EuiNotificationBadge>
                }
              >
                <EuiSpacer size="s" />
                {paginatedAvailableFields.map((field) => {
                  return (
                    <FieldItem
                      core={core}
                      data={data}
                      indexPattern={currentIndexPattern}
                      key={field.name}
                      field={field}
                      highlight={hilight}
                      exists={true}
                      dateRange={dateRange}
                      query={query}
                      filters={filters}
                    />
                  );
                })}

                {paginatedAvailableFields.length === 0 && (
                  <EuiCallOut
                    size="s"
                    color="warning"
                    title={
                      localState.typeFilter.length || localState.nameFilter.length
                        ? i18n.translate('xpack.lens.indexPatterns.noFilteredFieldsLabel', {
                            defaultMessage: 'No fields match the current filters.',
                          })
                        : paginatedEmptyFields
                        ? i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
                            defaultMessage: `Looks like you don't have any fields with data`,
                          })
                        : i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
                            defaultMessage: 'No fields exist in this index pattern.',
                          })
                    }
                  >
                    {(localState.typeFilter.length ||
                      localState.nameFilter.length ||
                      paginatedEmptyFields.length) && (
                      <>
                        <strong>
                          {i18n.translate('xpack.lens.indexPatterns.noFields.tryText', {
                            defaultMessage: 'Try:',
                          })}
                        </strong>
                        <ul>
                          <li>
                            {i18n.translate('xpack.lens.indexPatterns.noFields.extendTimeBullet', {
                              defaultMessage: 'Extending the time range',
                            })}
                          </li>
                          {localState.nameFilter.length ? (
                            <li>
                              {i18n.translate(
                                'xpack.lens.indexPatterns.noFields.fieldQueryFilterBullet',
                                {
                                  defaultMessage: 'Changing the field query filter',
                                }
                              )}
                            </li>
                          ) : null}
                          {localState.typeFilter.length ? (
                            <li>
                              {i18n.translate(
                                'xpack.lens.indexPatterns.noFields.fieldTypeFilterBullet',
                                {
                                  defaultMessage: 'Changing the field type filters',
                                }
                              )}
                            </li>
                          ) : null}
                          {filters.length ? (
                            <li>
                              {i18n.translate(
                                'xpack.lens.indexPatterns.noFields.globalFiltersBullet',
                                {
                                  defaultMessage: 'Changing the global filters',
                                }
                              )}
                            </li>
                          ) : null}
                        </ul>
                      </>
                    )}
                  </EuiCallOut>
                )}
              </EuiAccordion>
              <EuiSpacer size="s" />
              <EuiAccordion
                initialIsOpen={false}
                id="emptyFieldsLabel"
                buttonContent={
                  <EuiFormLabel>
                    {i18n.translate('xpack.lens.indexPattern.emptyFieldsLabel', {
                      defaultMessage: 'Empty fields',
                    })}
                  </EuiFormLabel>
                }
                extraAction={
                  <EuiNotificationBadge
                    size="m"
                    color={
                      localState.typeFilter.length || localState.nameFilter.length
                        ? 'accent'
                        : 'subdued'
                    }
                  >
                    {emptyFields.length}
                  </EuiNotificationBadge>
                }
              >
                <EuiSpacer size="s" />
                {paginatedEmptyFields.map((field) => {
                  return (
                    <FieldItem
                      core={core}
                      data={data}
                      indexPattern={currentIndexPattern}
                      key={field.name}
                      field={field}
                      highlight={hilight}
                      exists={false}
                      dateRange={dateRange}
                      query={query}
                      filters={filters}
                    />
                  );
                })}
              </EuiAccordion>

              <EuiSpacer size="l" />
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);
