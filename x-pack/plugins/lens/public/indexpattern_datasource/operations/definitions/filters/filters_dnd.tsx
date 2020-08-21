/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, MouseEventHandler } from 'react';
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
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EditFilterPopover, EmptyFilterPopover } from './filter_popover';

const makeId = htmlIdGenerator();

const makeFiltersListWithId = (filters) =>
  filters.map((f) => ({
    id: makeId(),
    f,
  }));

export const FiltersList = ({ filters, setFilters, indexPattern }) => {
  const onDragEnd = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(filters, source.index, destination.index);
      setFilters(items);
    }
  };

  return (
    <div>
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="s">
          {filters?.map((filter, idx) => {
            const { input, label } = filter;
            const id = JSON.stringify(input.query);
            return (
              <EuiDraggable
                spacing="m"
                key={id}
                index={idx}
                draggableId={id}
                customDragHandle={true}
              >
                {(provided) => (
                  <EuiPanel className="lnsLayerPanel__panel" paddingSize="s">
                    <EuiFlexGroup gutterSize="xs" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <div {...provided.dragHandleProps} className="lnsLayerPanel__dndGrab">
                          <EuiIcon
                            type="grab"
                            aria-label={i18n.translate('xpack.lens.indexPattern.filters.dnd', {
                              defaultMessage: 'Grab icon',
                            })}
                          />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <EditFilterPopover
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
                          setFilter={(newFilter) => {
                            setFilters(
                              filters.map((f) =>
                                f.input.query === filter.input.query ? f : newFilter
                              )
                            );
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          size="m"
                          iconType="cross"
                          color="danger"
                          onClick={() => {
                            setFilters(filters.filter((f) => f !== filter));
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
      <EmptyFilterPopover
        indexPattern={indexPattern}
        setFilter={(filter) => setFilters(filters.concat(filter))}
      />
    </div>
  );
};
