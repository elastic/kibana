/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ControlGroupInput,
  ControlGroupContainer,
  controlGroupInputBuilder,
} from '@kbn/controls-plugin/public';
import { LazyControlGroupRenderer } from '@kbn/controls-plugin/public';
import type { PropsWithChildren } from 'react';
import React, { createContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { Subscription } from 'rxjs';

import styled from 'styled-components';
import { cloneDeep, debounce } from 'lodash';
import { withSuspense } from '@kbn/shared-ux-utility';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../../hooks/use_url_state';
import type { FilterContextType, FilterGroupProps, FilterUrlFormat } from './types';
import { useFilterUpdatesToUrlSync } from './hooks/use_filter_update_to_url_sync';

type ControlGroupBuilder = typeof controlGroupInputBuilder;

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export const FilterContext = createContext<FilterContextType | undefined>(undefined);

const FilterWrapper = styled.div.attrs((props) => ({
  className: props.className,
}))`
  & .euiFilterButton-hasActiveFilters {
    font-weight: 400;
  }

  & .controlGroup {
    min-height: 40px;
  }
`;

export const FilterGroup = (props: PropsWithChildren<FilterGroupProps>) => {
  const {
    dataViewId,
    onFilterChange,
    timeRange,
    filters,
    query,
    chainingSystem = 'HIERARCHICAL',
    initialControls,
  } = props;

  const filterChangedSubscription = useRef<Subscription>();
  const inputChangedSubscription = useRef<Subscription>();

  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  const [controlGroupInputUpdates, setControlGroupInputUpdates] = useState<
    ControlGroupInput | undefined
  >();

  const [initialUrlParam, setInitialUrlParam] =
    useState<Array<FilterUrlFormat[keyof FilterUrlFormat]>>();

  const urlDataApplied = useRef<boolean>(false);

  const onUrlParamInit = (param: Array<FilterUrlFormat[keyof FilterUrlFormat]> | null) => {
    if (param == null) return;
    try {
      setInitialUrlParam(param);
    } catch (err) {
      // if there is an error ignore url Param
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  useInitializeUrlParam(URL_PARAM_KEY.pageFilter, onUrlParamInit);

  useEffect(() => {
    const cleanup = () => {
      if (filterChangedSubscription.current) {
        filterChangedSubscription.current.unsubscribe();
      }
    };
    return cleanup;
  }, []);

  useEffect(() => {
    controlGroup?.updateInput({
      timeRange,
      filters,
      query,
      chainingSystem,
    });
  }, [timeRange, filters, query, chainingSystem, controlGroup]);

  const handleFilterUpdates = useCallback(
    (newFilters: Filter[]) => {
      if (onFilterChange) onFilterChange(newFilters);
    },
    [onFilterChange]
  );

  const debouncedFilterUpdates = useMemo(
    () => debounce(handleFilterUpdates, 500),
    [handleFilterUpdates]
  );

  const handleInputUpdates = useCallback((newInput: ControlGroupInput) => {
    setControlGroupInputUpdates(newInput);
  }, []);

  const debouncedInputUpdatesHandler = useMemo(
    () => debounce(handleInputUpdates, 500),
    [handleInputUpdates]
  );

  useEffect(() => {
    if (!controlGroup) return;
    controlGroup.reload();
    filterChangedSubscription.current = controlGroup.onFiltersPublished$.subscribe({
      next: debouncedFilterUpdates,
    });

    inputChangedSubscription.current = controlGroup.getInput$().subscribe({
      next: debouncedInputUpdatesHandler,
    });
  }, [controlGroup, debouncedFilterUpdates, debouncedInputUpdatesHandler]);

  const onControlGroupLoadHandler = useCallback((controlGroupContainer: ControlGroupContainer) => {
    setControlGroup(controlGroupContainer);
  }, []);

  const clearSelection = useCallback(() => {
    if (!controlGroupInputUpdates) return;

    const { panels } = controlGroupInputUpdates;
    Object.values(panels).forEach((control, idx) => {
      controlGroup?.updateInputForChild(String(idx), {
        ...control.explicitInput,
        selectedOptions: [],
      });
    });
  }, [controlGroupInputUpdates, controlGroup]);

  const setOptions = useCallback(
    async (
      defaultInput: Partial<ControlGroupInput>,
      { addOptionsListControl }: ControlGroupBuilder
    ) => {
      const initialInput: Partial<ControlGroupInput> = {
        ...defaultInput,
        defaultControlWidth: 'small',
        viewMode: ViewMode.VIEW,
        timeRange,
        filters,
        query,
        chainingSystem,
      };

      // we want minimum of 4 fields to be dispayed in that particular order
      const localInitialControls = cloneDeep(initialControls);
      if (localInitialControls && localInitialControls.length >= 4) {
        // if initialUrlParam Exists... replace localInitialControls with what was provided in the Url
        if (initialUrlParam && !urlDataApplied.current) {
          let maxInitialControlIdx = localInitialControls.length - 1;
          for (let counter = initialUrlParam.length - 1; counter >= 0; counter--) {
            const urlControl = initialUrlParam[counter];
            const idx = localInitialControls.findIndex(
              (item) => item.fieldName === urlControl.fieldName
            );

            if (idx !== -1) {
              // if index found, replace that with what was provided in the Url
              localInitialControls[idx] = {
                ...localInitialControls[idx],
                fieldName: urlControl.fieldName,
                title: urlControl.title ?? urlControl.fieldName,
                selectedOptions: urlControl.selectedOptions ?? [],
              };
            } else {
              // if url param is not available in initialControl, start replacing the last slot in the
              // initial Control with the last `not found` element in the Url Param
              //
              localInitialControls[maxInitialControlIdx] = {
                fieldName: urlControl.fieldName,
                selectedOptions: urlControl.selectedOptions ?? [],
                title: urlControl.title ?? urlControl.fieldName,
              };
              maxInitialControlIdx--;
            }
          }
        }

        urlDataApplied.current = true;

        localInitialControls.forEach((control, idx) => {
          addOptionsListControl(initialInput, {
            controlId: String(idx),
            dataViewId,
            ...control,
          });
        });
      }
      return initialInput;
    },
    [initialControls, dataViewId, timeRange, filters, chainingSystem, query, initialUrlParam]
  );

  useFilterUpdatesToUrlSync({
    controlGroupInput: controlGroupInputUpdates,
  });

  return (
    <FilterWrapper className="filter-group__wrapper">
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
        <EuiFlexItem grow={true}>
          <ControlGroupRenderer
            onLoadComplete={onControlGroupLoadHandler}
            getInitialInput={setOptions}
          />
          {!controlGroup ? (
            <EuiButton color="text">
              <EuiLoadingChart />
            </EuiButton>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="eraser" color="danger" onClick={clearSelection}>
            {`Clear`}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="plusInCircle" onClick={clearSelection}>
            {`Add Filter`}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {props.children}
    </FilterWrapper>
  );
};
