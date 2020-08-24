/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState, useRef } from 'react';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  euiDragDropReorder,
  EuiButtonIcon,
  EuiLink,
  EuiText,
  EuiButtonEmpty,
  EuiPopover,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter } from '.';

import { IndexPattern } from '../../../types';

import {
  QueryStringInput,
  Query,
  esKuery,
  esQuery,
} from '../../../../../../../../src/plugins/data/public';

export enum SEARCH_QUERY_LANGUAGE {
  KUERY = 'kuery',
  LUCENE = 'lucene',
}

const emptyFilter: Filter = {
  input: {
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  },
  label: '',
};

const defaultPlaceholderMessage = i18n.translate(
  'xpack.lens.indexPattern.filters.label.placeholder',
  {
    defaultMessage: 'All requests',
  }
);

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  Button,
}: {
  filter: Filter;
  setFilter: Function;
  indexPattern: IndexPattern;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(filter);

  const inputRef = useRef<HTMLInputElement>();
  const onQueryChange = (input: Query) => setTempFilter({ ...tempFilter, input });
  const onLabelChange = (label: string) => setTempFilter({ ...tempFilter, label });
  const onSubmit = (input: Query) => {
    try {
      if (input.language === SEARCH_QUERY_LANGUAGE.KUERY) {
        esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(input.query), indexPattern);
      } else if (input.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
        esQuery.luceneStringToDsl(input.query);
      }
      if (input.query.length) {
        if (tempFilter.label) {
          setFilter(tempFilter);
          setIsPopoverOpen(false);
        } else {
          if (inputRef.current) inputRef.current.focus();
        }
      }
    } catch (e) {
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
    }
  };

  return (
    <EuiPopover
      anchorClassName="lnsLayerPanel__anchor"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        setTempFilter(filter);
      }}
      button={<Button onClick={() => setIsPopoverOpen((open) => !open)} />}
    >
      <EuiForm>
        <EuiFormRow fullWidth>
          <QueryStringInput
            bubbleSubmitEvent={true}
            indexPatterns={[indexPattern]}
            query={tempFilter.input}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder={
              tempFilter.input.language === SEARCH_QUERY_LANGUAGE.KUERY
                ? i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderKql', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method : "GET" or status : "404"' },
                  })
                : i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderLucene', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method:GET OR status:404' },
                  })
            }
            dataTestSubj="transformQueryInput"
            languageSwitcherPopoverAnchorPosition="rightDown"
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFieldText
            inputRef={(node) => {
              if (node) {
                inputRef.current = node;
              }
            }}
            value={tempFilter.label || ''}
            onChange={(e) => onLabelChange(e.target.value.trim())}
            onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
              if (keys.ENTER === key) {
                if (tempFilter.input.query.length) {
                  setFilter(tempFilter);
                  setIsPopoverOpen(false);
                  setTempFilter(emptyFilter);
                }
              }
              if (keys.ESCAPE === key) {
                setIsPopoverOpen(false);
              }
            }}
            fullWidth
            placeholder={
              tempFilter.input.query.length
                ? (tempFilter.input.query as string)
                : defaultPlaceholderMessage
            }
            prepend="Label*" // todo: is this tooltip?
            aria-label={i18n.translate('xpack.lens.indexPattern.filters.label.aria-message', {
              defaultMessage: 'Label for your filter',
            })}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};

const countDuplicates = (filterArr: Filter[], filter: Filter) =>
  filterArr.filter(
    (f) =>
      JSON.stringify(f.input.query.trim()) === JSON.stringify(filter.input.query.trim()) &&
      f.label === filter.label
  ).length;

const makeUniqueLabel = (filterArr: Filter[], filter: Filter) => {
  let label = '';
  let count = 0;
  do {
    count++;
    label = `${filter.input.query} [${count}]`;
  } while (filterArr.find((f) => f.label === label));
  return label;
};

interface DraggableLocation {
  droppableId: string;
  index: number;
}

export const FiltersList = ({
  filters,
  setFilters,
  indexPattern,
}: {
  filters: Filter[];
  setFilters: Function;
  indexPattern: IndexPattern;
}) => {
  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(filters, source.index, destination.index);
      setFilters(items);
    }
  };

  return (
    <div>
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="s">
          {filters?.map((filter: Filter, idx: number) => {
            const { input, label } = filter;
            const id = `${JSON.stringify(input.query)}_${label}`;
            return (
              <EuiDraggable
                spacing="m"
                key={id}
                index={idx}
                draggableId={id}
                customDragHandle={true}
              >
                {(provided) => (
                  <EuiPanel className="lnsLayerPanel__panel" paddingSize="none">
                    <EuiFlexGroup gutterSize="xs" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <div {...provided.dragHandleProps} className="lnsLayerPanel__dndGrab">
                          <EuiIcon
                            type="grab"
                            aria-label={i18n.translate('xpack.lens.indexPattern.filters.grabIcon', {
                              defaultMessage: 'Grab icon',
                            })}
                          />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <FilterPopover
                          indexPattern={indexPattern}
                          filter={filter}
                          Button={({ onClick }: { onClick: MouseEventHandler }) => (
                            <EuiLink
                              color="text"
                              onClick={onClick}
                              className="lnsLayerPanel__filterLink"
                            >
                              <EuiText size="s" textAlign="left">
                                {label ? label : input.query}
                              </EuiText>
                            </EuiLink>
                          )}
                          setFilter={(newFilter: Filter) => {
                            if (countDuplicates(filters, newFilter) > 1) {
                              newFilter.label = makeUniqueLabel(filters, newFilter);
                            }
                            setFilters(filters.map((f: Filter) => (f === filter ? newFilter : f)));
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          size="m"
                          iconType="cross"
                          color="danger"
                          onClick={() => {
                            setFilters(filters.filter((f: Filter) => f !== filter));
                          }}
                          aria-label={i18n.translate(
                            'xpack.lens.indexPattern.filters.deleteSearchQuery',
                            {
                              defaultMessage: 'Delete filter',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            );
          })}
        </EuiDroppable>
      </EuiDragDropContext>

      <FilterPopover
        indexPattern={indexPattern}
        filter={emptyFilter}
        Button={({ onClick }: { onClick: MouseEventHandler }) => (
          <EuiButtonEmpty iconType="plusInCircle" onClick={onClick}>
            {i18n.translate('xpack.lens.indexPattern.filters.addSearchQuery', {
              defaultMessage: 'Add a search query',
            })}
          </EuiButtonEmpty>
        )}
        setFilter={(newFilter: Filter) => {
          if (countDuplicates(filters, newFilter) > 0) {
            newFilter.label = makeUniqueLabel(filters, newFilter);
          }
          setFilters(filters.concat(newFilter));
        }}
      />
    </div>
  );
};
