/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type {
  ControlGroupInput,
  controlGroupInputBuilder,
  ControlGroupOutput,
  ControlGroupContainer,
  ControlGroupRendererProps,
} from '@kbn/controls-plugin/public';
import { LazyControlGroupRenderer } from '@kbn/controls-plugin/public';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Subscription } from 'rxjs';
import styled from 'styled-components';
import { cloneDeep, debounce, isEqual } from 'lodash';
import { withSuspense } from '@kbn/shared-ux-utility';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../../hooks/use_url_state';
import type { FilterGroupProps, FilterItemObj } from './types';
import { useFilterUpdatesToUrlSync } from './hooks/use_filter_update_to_url_sync';
import { APP_ID } from '../../../../common/constants';
import './index.scss';
import { FilterGroupLoading } from './loading';
import { withSpaceId } from '../with_space_id';
import { NUM_OF_CONTROLS } from './config';
import { useControlGroupSyncToLocalStorage } from './hooks/use_control_group_sync_to_local_storage';
import { useViewEditMode } from './hooks/use_view_edit_mode';
import { FilterGroupContextMenu } from './context_menu';
import { AddControl, DiscardChanges, SaveControls } from './buttons';
import { getFilterItemObjListFromControlInput } from './utils';
import { FiltersChangedBanner } from './filters_changed_banner';
import { FilterGroupContext } from './filter_group_context';

type ControlGroupBuilder = typeof controlGroupInputBuilder;

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

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

const FilterGroupComponent = (props: PropsWithChildren<FilterGroupProps>) => {
  const {
    dataViewId,
    onFilterChange,
    timeRange,
    filters,
    query,
    chainingSystem = 'HIERARCHICAL',
    initialControls,
    spaceId,
    onInit,
  } = props;

  const filterChangedSubscription = useRef<Subscription>();
  const inputChangedSubscription = useRef<Subscription>();

  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  const localStoragePageFilterKey = useMemo(
    () => `${APP_ID}.${spaceId}.${URL_PARAM_KEY.pageFilter}`,
    [spaceId]
  );

  const currentFiltersRef = useRef<Filter[]>();

  const {
    isViewMode,
    hasPendingChanges,
    pendingChangesPopoverOpen,
    closePendingChangesPopover,
    openPendingChangesPopover,
    switchToViewMode,
    switchToEditMode,
    setHasPendingChanges,
  } = useViewEditMode({
    controlGroup,
  });

  const {
    controlGroupInput: controlGroupInputUpdates,
    setControlGroupInput: setControlGroupInputUpdates,
    getStoredControlGroupInput: getStoredControlInput,
  } = useControlGroupSyncToLocalStorage({
    storageKey: localStoragePageFilterKey,
    shouldSync: isViewMode,
  });

  const [initialUrlParam, setInitialUrlParam] = useState<FilterItemObj[]>();

  const [showFiltersChangedBanner, setShowFiltersChangedBanner] = useState(false);

  const urlDataApplied = useRef<boolean>(false);

  const onUrlParamInit = (param: FilterItemObj[] | null) => {
    if (!param) {
      setInitialUrlParam([]);
      return;
    }
    try {
      const storedControlGroupInput = getStoredControlInput();
      if (storedControlGroupInput) {
        const panelsFormatted = getFilterItemObjListFromControlInput(storedControlGroupInput);
        if (!isEqual(panelsFormatted, param)) {
          setShowFiltersChangedBanner(true);
          switchToEditMode();
        }
      }
      setInitialUrlParam(param);
    } catch (err) {
      // if there is an error ignore url Param
      // eslint-disable-next-line no-console
      console.error(err);
      setInitialUrlParam([]);
    }
  };

  useInitializeUrlParam(URL_PARAM_KEY.pageFilter, onUrlParamInit);

  useEffect(() => {
    const cleanup = () => {
      [filterChangedSubscription.current, inputChangedSubscription.current].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
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

  const handleInputUpdates = useCallback(
    (newInput: ControlGroupInput) => {
      if (isEqual(getStoredControlInput(), newInput)) return;
      if (!isEqual(newInput.panels, getStoredControlInput()?.panels) && !isViewMode) {
        setHasPendingChanges(true);
      }
      setControlGroupInputUpdates(newInput);
    },
    [setControlGroupInputUpdates, getStoredControlInput, isViewMode, setHasPendingChanges]
  );

  const handleFilterUpdates = useCallback(
    ({ filters: newFilters }: ControlGroupOutput) => {
      if (isEqual(currentFiltersRef.current, newFilters)) return;
      if (onFilterChange) onFilterChange(newFilters ?? []);
      currentFiltersRef.current = newFilters ?? [];
    },
    [onFilterChange]
  );

  const debouncedFilterUpdates = useMemo(
    () => debounce(handleFilterUpdates, 500),
    [handleFilterUpdates]
  );

  useEffect(() => {
    if (!controlGroup) return;
    filterChangedSubscription.current = controlGroup.getOutput$().subscribe({
      next: debouncedFilterUpdates,
    });

    inputChangedSubscription.current = controlGroup.getInput$().subscribe({
      next: handleInputUpdates,
    });

    const cleanup = () => {
      [filterChangedSubscription.current, inputChangedSubscription.current].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };
    return cleanup;
  }, [controlGroup, debouncedFilterUpdates, handleInputUpdates]);

  const onControlGroupLoadHandler = useCallback(
    (controlGroupContainer: ControlGroupContainer) => {
      if (onInit) onInit(controlGroupContainer);
      setControlGroup(controlGroupContainer);
    },
    [onInit]
  );

  const selectControlsWithPriority = useCallback(() => {
    /*
     *
     * Below is the priority of how controls are fetched.
     *  1. URL
     *  2. If not found in URL, see in Localstorage
     *  3. If not found in Localstorage, defaultControls are assigned
     *
     * */

    const localInitialControls = cloneDeep(initialControls);
    const resultControls = cloneDeep(initialControls);

    let overridingControls = initialUrlParam;
    if (!initialUrlParam || initialUrlParam.length === 0) {
      // if nothing is found in URL Param.. read from local storage
      const storedControlGroupInput = getStoredControlInput();
      if (storedControlGroupInput) {
        const urlParamsFromLocalStorage: FilterItemObj[] =
          getFilterItemObjListFromControlInput(storedControlGroupInput);

        overridingControls = urlParamsFromLocalStorage;
      }
    }

    if (!overridingControls || overridingControls.length === 0) return initialControls;

    // if initialUrlParam Exists... replace localInitialControls with what was provided in the Url
    if (overridingControls && !urlDataApplied.current) {
      let maxInitialControlIdx = Math.max(
        localInitialControls.length - 1,
        (overridingControls?.length ?? 1) - 1
      );
      for (let counter = overridingControls.length - 1; counter >= 0; counter--) {
        const urlControl = overridingControls[counter];
        const idx = localInitialControls.findIndex(
          (item) => item.fieldName === urlControl.fieldName
        );

        if (idx !== -1) {
          // if index found, replace that with what was provided in the Url
          resultControls[idx] = {
            ...localInitialControls[idx],
            fieldName: urlControl.fieldName,
            title: urlControl.title ?? urlControl.fieldName,
            selectedOptions: urlControl.selectedOptions ?? [],
            existsSelected: urlControl.existsSelected ?? false,
            exclude: urlControl.exclude ?? false,
          };
        } else {
          // if url param is not available in initialControl, start replacing the last slot in the
          // initial Control with the last `not found` element in the Url Param
          //
          resultControls[maxInitialControlIdx] = {
            fieldName: urlControl.fieldName,
            selectedOptions: urlControl.selectedOptions ?? [],
            title: urlControl.title ?? urlControl.fieldName,
            existsSelected: urlControl.existsSelected ?? false,
            exclude: urlControl.exclude ?? false,
          };
          maxInitialControlIdx--;
        }
      }
    }

    return resultControls;
  }, [initialUrlParam, initialControls, getStoredControlInput]);

  const getCreationOptions: ControlGroupRendererProps['getCreationOptions'] = useCallback(
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

      const finalControls = selectControlsWithPriority();

      urlDataApplied.current = true;

      finalControls.forEach((control, idx) => {
        addOptionsListControl(initialInput, {
          controlId: String(idx),
          hideExclude: true,
          hideSort: true,
          hidePanelTitles: true,
          placeholder: '',
          // option List controls will handle an invalid dataview
          // & display an appropriate message
          dataViewId: dataViewId ?? '',
          ...control,
        });
      });

      return {
        initialInput,
        settings: {
          showAddButton: false,
          staticDataViewId: dataViewId ?? '',
          editorConfig: {
            hideWidthSettings: true,
            hideDataViewSelector: true,
            hideAdditionalSettings: true,
          },
        },
      };
    },
    [dataViewId, timeRange, filters, chainingSystem, query, selectControlsWithPriority]
  );

  useFilterUpdatesToUrlSync({
    controlGroupInput: controlGroupInputUpdates,
  });

  const discardChangesHandler = useCallback(() => {
    if (hasPendingChanges) {
      controlGroup?.updateInput({
        panels: getStoredControlInput()?.panels,
      });
    }
    switchToViewMode();
    setShowFiltersChangedBanner(false);
  }, [controlGroup, switchToViewMode, getStoredControlInput, hasPendingChanges]);

  const saveChangesHandler = useCallback(() => {
    switchToViewMode();
    setShowFiltersChangedBanner(false);
  }, [switchToViewMode]);

  const addControlsHandler = useCallback(() => {
    controlGroup?.openAddDataControlFlyout();
  }, [controlGroup]);

  return (
    <FilterGroupContext.Provider
      value={{
        dataViewId: dataViewId ?? '',
        initialControls,
        isViewMode,
        controlGroup,
        controlGroupInputUpdates,
        hasPendingChanges,
        pendingChangesPopoverOpen,
        setHasPendingChanges,
        switchToEditMode,
        switchToViewMode,
        openPendingChangesPopover,
        closePendingChangesPopover,
        setShowFiltersChangedBanner,
      }}
    >
      <FilterWrapper className="filter-group__wrapper">
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
          {Array.isArray(initialUrlParam) ? (
            <EuiFlexItem grow={true} data-test-subj="filter_group__items">
              <ControlGroupRenderer
                onLoadComplete={onControlGroupLoadHandler}
                getCreationOptions={getCreationOptions}
              />
              {!controlGroup ? <FilterGroupLoading /> : null}
            </EuiFlexItem>
          ) : null}
          {!isViewMode &&
          (Object.keys(controlGroupInputUpdates?.panels ?? {}).length > NUM_OF_CONTROLS.MIN ||
            Object.keys(controlGroupInputUpdates?.panels ?? {}).length < NUM_OF_CONTROLS.MAX) ? (
            <>
              <EuiFlexItem grow={false}>
                <AddControl onClick={addControlsHandler} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SaveControls onClick={saveChangesHandler} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DiscardChanges onClick={discardChangesHandler} />
              </EuiFlexItem>
            </>
          ) : null}
          <EuiFlexItem grow={false}>
            <FilterGroupContextMenu />
          </EuiFlexItem>
        </EuiFlexGroup>
        {showFiltersChangedBanner ? (
          <>
            <EuiSpacer size="l" />
            <FiltersChangedBanner />
          </>
        ) : null}
      </FilterWrapper>
    </FilterGroupContext.Provider>
  );
};

// FilterGroupNeeds spaceId to be invariant because it is being used in localstorage
// Hence we will render component only when spaceId has a value.
export const FilterGroup = withSpaceId<FilterGroupProps>(
  FilterGroupComponent,
  <FilterGroupLoading />
);
