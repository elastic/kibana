/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  HasInPlaceLibraryTransforms,
  PublishesDataViews,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesWritablePanelTitle,
  SerializedTitles,
  StateComparators,
  getUnchangingComparator,
  initializeTitles,
} from '@kbn/presentation-publishing';
import { apiPublishesSettings } from '@kbn/presentation-containers';
import { buildObservableVariable } from '../helper';
import type {
  LensComponentProps,
  LensPanelProps,
  LensRuntimeState,
  LensEmbeddableStartServices,
  LensByReference,
  LensOverrides,
  LensSharedProps,
} from '../types';
import { createComparatorForStatePortion } from './initialize_state_management';
import { apiHasLensComponentProps } from '../type_guards';

// Convenience type for the serialized props of this initializer
type SerializedProps = SerializedTitles &
  LensPanelProps &
  LensByReference &
  LensOverrides &
  Omit<LensSharedProps, 'viewMode'>;

/**
 * Everything about panel and library services
 */
export function initializeDashboardServices(
  initialState: LensRuntimeState,
  getLatestState: () => LensRuntimeState,
  parentApi: unknown,
  {
    variables,
  }: {
    variables: {
      state$: BehaviorSubject<LensRuntimeState>;
      dataViews$: BehaviorSubject<DataView[] | undefined>;
    };
  },
  { attributeService }: LensEmbeddableStartServices
): {
  api: PublishesPanelTitle &
    PublishesDataViews &
    PublishesWritablePanelTitle &
    PublishesSavedObjectId &
    HasInPlaceLibraryTransforms;
  serialize: () => SerializedProps;
  comparators: StateComparators<SerializedProps>;
  cleanup: () => void;
} {
  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState.savedObjectId);
  const { titlesApi, serializeTitles, titleComparators } = initializeTitles(initialState);
  const [defaultPanelTitle$] = buildObservableVariable<string | undefined>(
    initialState.title || initialState.attributes.title
  );
  const [defaultPanelDescription$] = buildObservableVariable<string | undefined>(
    initialState.description || initialState.attributes.description
  );
  return {
    api: {
      defaultPanelTitle: defaultPanelTitle$,
      ...titlesApi,
      dataViews: variables.dataViews$,
      savedObjectId: savedObjectId$,
      libraryId$: savedObjectId$,
      saveToLibrary: async (title: string) => {
        const state = getLatestState();
        const savedObjectId = await attributeService.saveToLibrary(
          { ...state.attributes, title },
          state.attributes.references
        );
        return savedObjectId;
      },
      checkForDuplicateTitle: async (
        newTitle: string,
        isTitleDuplicateConfirmed: boolean,
        onTitleDuplicate: () => void
      ) => {
        await attributeService.checkForDuplicateTitle({
          newTitle,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
          newCopyOnSave: false,
          newDescription: '',
          displayName: '',
          lastSavedTitle: '',
          copyOnSave: false,
        });
      },
      canLinkToLibrary: async () => !getLatestState().savedObjectId,
      canUnlinkFromLibrary: async () => Boolean(getLatestState().savedObjectId),
      unlinkFromLibrary: () => {
        savedObjectId$.next(undefined);
        if ((titlesApi.panelTitle.getValue() ?? '').length === 0) {
          titlesApi.setPanelTitle(defaultPanelTitle$.getValue());
        }
        if ((titlesApi.panelDescription.getValue() ?? '').length === 0) {
          titlesApi.setPanelDescription(defaultPanelDescription$.getValue());
        }
        defaultPanelTitle$.next(undefined);
        defaultPanelDescription$.next(undefined);
      },
      getByValueRuntimeSnapshot(): object {
        const { savedObjectId, ...rest } = getLatestState();
        return rest;
      },
    },
    serialize: () => {
      const { style, noPadding, className } = apiHasLensComponentProps(parentApi)
        ? parentApi
        : ({} as LensComponentProps);
      const settings = apiPublishesSettings(parentApi)
        ? {
            syncColors: parentApi.settings.syncColors$.getValue(),
            syncCursor: parentApi.settings.syncCursor$.getValue(),
            syncTooltips: parentApi.settings.syncTooltips$.getValue(),
          }
        : {};
      return {
        ...serializeTitles(),
        style,
        noPadding,
        className,
        ...settings,
        palette: initialState.palette,
        savedObjectId: savedObjectId$.getValue(),
      };
    },
    comparators: {
      ...titleComparators,
      id: getUnchangingComparator<SerializedTitles & LensPanelProps, 'id'>(),
      palette: getUnchangingComparator<SerializedTitles & LensPanelProps, 'palette'>(),
      savedObjectId: createComparatorForStatePortion(variables.state$, 'savedObjectId'),
      disableTriggers: createComparatorForStatePortion(variables.state$, 'disableTriggers'),
      overrides: createComparatorForStatePortion(variables.state$, 'overrides'),
      renderMode: getUnchangingComparator<SerializedTitles & LensPanelProps, 'renderMode'>(),
      syncColors: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncColors'>(),
      syncCursor: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncCursor'>(),
      syncTooltips: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncTooltips'>(),
      executionContext: getUnchangingComparator<LensSharedProps, 'executionContext'>(),
      noPadding: getUnchangingComparator<LensSharedProps, 'noPadding'>(),
      style: getUnchangingComparator<LensSharedProps, 'style'>(),
      className: getUnchangingComparator<LensSharedProps, 'className'>(),
    },
    cleanup: noop,
  };
}
