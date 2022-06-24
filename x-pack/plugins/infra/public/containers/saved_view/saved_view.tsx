/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useCallback, useMemo, useState, useEffect, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { SimpleSavedObject, SavedObjectAttributes } from '@kbn/core/public';
import { useUrlState } from '../../utils/use_url_state';
import { useFindSavedObject } from '../../hooks/use_find_saved_object';
import { useCreateSavedObject } from '../../hooks/use_create_saved_object';
import { useDeleteSavedObject } from '../../hooks/use_delete_saved_object';
import { Source } from '../metrics_source';
import { metricsExplorerViewSavedObjectName } from '../../../common/saved_objects/metrics_explorer_view';
import { inventoryViewSavedObjectName } from '../../../common/saved_objects/inventory_view';
import { useSourceConfigurationFormState } from '../../pages/metrics/settings/source_configuration_form_state';
import { useGetSavedObject } from '../../hooks/use_get_saved_object';
import { useUpdateSavedObject } from '../../hooks/use_update_saved_object';

export type SavedView<ViewState> = ViewState & {
  name: string;
  id: string;
  isDefault?: boolean;
};

export type SavedViewSavedObject<ViewState = {}> = ViewState & {
  name: string;
};

export type ViewType =
  | typeof metricsExplorerViewSavedObjectName
  | typeof inventoryViewSavedObjectName;

interface Props {
  defaultViewState: SavedView<any>;
  viewType: ViewType;
  shouldLoadDefault: boolean;
}

const savedViewUrlStateRT = rt.type({
  viewId: rt.string,
});
type SavedViewUrlState = rt.TypeOf<typeof savedViewUrlStateRT>;
const DEFAULT_SAVED_VIEW_STATE: SavedViewUrlState = {
  viewId: '0',
};

export const useSavedView = (props: Props) => {
  const {
    source,
    isLoading: sourceIsLoading,
    sourceExists,
    createSourceConfiguration,
    updateSourceConfiguration,
  } = useContext(Source.Context);
  const { viewType, defaultViewState } = props;
  type ViewState = typeof defaultViewState;
  const {
    data,
    loading,
    find,
    error: errorOnFind,
    hasView,
  } = useFindSavedObject<SavedViewSavedObject<ViewState>>(viewType);
  const [urlState, setUrlState] = useUrlState<SavedViewUrlState>({
    defaultState: DEFAULT_SAVED_VIEW_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'savedView',
  });

  const [shouldLoadDefault] = useState(props.shouldLoadDefault);
  const [currentView, setCurrentView] = useState<SavedView<any> | null>(null);
  const [loadingDefaultView, setLoadingDefaultView] = useState<boolean | null>(null);
  const {
    create,
    error: errorOnCreate,
    data: createdViewData,
    createdId,
  } = useCreateSavedObject(viewType);
  const {
    update,
    error: errorOnUpdate,
    data: updatedViewData,
    updatedId,
  } = useUpdateSavedObject(viewType);
  const { deleteObject, deletedId } = useDeleteSavedObject(viewType);
  const { getObject, data: currentViewSavedObject } = useGetSavedObject(viewType);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => setCreateError(errorOnCreate), [errorOnCreate]);

  const deleteView = useCallback((id: string) => deleteObject(id), [deleteObject]);
  const formState = useSourceConfigurationFormState(source && source.configuration);
  const defaultViewFieldName = useMemo(
    () => (viewType === 'inventory-view' ? 'inventoryDefaultView' : 'metricsExplorerDefaultView'),
    [viewType]
  );

  const makeDefault = useCallback(
    async (id: string) => {
      if (sourceExists) {
        await updateSourceConfiguration({
          ...formState.formStateChanges,
          [defaultViewFieldName]: id,
        });
      } else {
        await createSourceConfiguration({
          ...formState.formState,
          [defaultViewFieldName]: id,
        });
      }
    },
    [
      formState.formState,
      formState.formStateChanges,
      sourceExists,
      defaultViewFieldName,
      createSourceConfiguration,
      updateSourceConfiguration,
    ]
  );

  const saveView = useCallback(
    (d: { [p: string]: any }) => {
      const doSave = async () => {
        const exists = await hasView(d.name);
        if (exists) {
          setCreateError(
            i18n.translate('xpack.infra.savedView.errorOnCreate.duplicateViewName', {
              defaultMessage: `A view with that name already exists.`,
            })
          );
          return;
        }
        create(d);
      };
      setCreateError(null);
      doSave();
    },
    [create, hasView]
  );

  const updateView = useCallback(
    (id, d: { [p: string]: any }) => {
      const doSave = async () => {
        const view = await hasView(d.name);
        if (view && view.id !== id) {
          setCreateError(
            i18n.translate('xpack.infra.savedView.errorOnCreate.duplicateViewName', {
              defaultMessage: `A view with that name already exists.`,
            })
          );
          return;
        }
        update(id, d);
      };
      setCreateError(null);
      doSave();
    },
    [update, hasView]
  );

  const defaultViewId = useMemo(() => {
    if (!source || !source.configuration) {
      return '';
    }
    if (defaultViewFieldName === 'inventoryDefaultView') {
      return source.configuration.inventoryDefaultView;
    } else if (defaultViewFieldName === 'metricsExplorerDefaultView') {
      return source.configuration.metricsExplorerDefaultView;
    } else {
      return '';
    }
  }, [source, defaultViewFieldName]);

  const mapToView = useCallback(
    (o: SimpleSavedObject<SavedObjectAttributes>) => {
      return {
        ...o.attributes,
        id: o.id,
        isDefault: defaultViewId === o.id,
      };
    },
    [defaultViewId]
  );

  const savedObjects = useMemo(() => (data ? data.savedObjects : []), [data]);

  const views = useMemo(() => {
    const items: Array<SavedView<ViewState>> = [
      {
        name: i18n.translate('xpack.infra.savedView.defaultViewNameHosts', {
          defaultMessage: 'Default view',
        }),
        id: '0',
        isDefault: !defaultViewId || defaultViewId === '0', // If there is no default view then hosts is the default
        ...defaultViewState,
      },
    ];

    savedObjects.forEach((o) => o.type === viewType && items.push(mapToView(o)));

    return items;
  }, [defaultViewState, savedObjects, viewType, defaultViewId, mapToView]);

  const createdView = useMemo(() => {
    return createdViewData ? mapToView(createdViewData) : null;
  }, [createdViewData, mapToView]);

  const updatedView = useMemo(() => {
    return updatedViewData ? mapToView(updatedViewData) : null;
  }, [updatedViewData, mapToView]);

  const loadDefaultView = useCallback(() => {
    setLoadingDefaultView(true);
    getObject(defaultViewId);
  }, [setLoadingDefaultView, getObject, defaultViewId]);

  useEffect(() => {
    if (currentViewSavedObject) {
      setCurrentView(mapToView(currentViewSavedObject));
      setLoadingDefaultView(false);
    }
  }, [currentViewSavedObject, defaultViewId, mapToView]);

  const setDefault = useCallback(() => {
    setCurrentView({
      name: i18n.translate('xpack.infra.savedView.defaultViewNameHosts', {
        defaultMessage: 'Default view',
      }),
      id: '0',
      isDefault: !defaultViewId || defaultViewId === '0', // If there is no default view then hosts is the default
      ...defaultViewState,
    });
  }, [setCurrentView, defaultViewId, defaultViewState]);

  const loadDefaultViewIfSet = useCallback(() => {
    if (defaultViewId !== '0') {
      loadDefaultView();
    } else {
      setDefault();
      setLoadingDefaultView(false);
    }
  }, [defaultViewId, loadDefaultView, setDefault, setLoadingDefaultView]);

  useEffect(() => {
    if (loadingDefaultView || currentView || !shouldLoadDefault) {
      return;
    }

    loadDefaultViewIfSet();
  }, [loadDefaultViewIfSet, loadingDefaultView, currentView, shouldLoadDefault]);

  useEffect(() => {
    if (currentView && urlState.viewId !== currentView.id && data)
      setUrlState({ viewId: currentView.id });
  }, [urlState, setUrlState, currentView, defaultViewId, data]);

  useEffect(() => {
    if (!currentView && !loading && data && shouldLoadDefault) {
      const viewToSet = views.find((v) => v.id === urlState.viewId);
      if (viewToSet) setCurrentView(viewToSet);
      else loadDefaultViewIfSet();
    }
  }, [
    loading,
    currentView,
    data,
    views,
    setCurrentView,
    loadDefaultViewIfSet,
    urlState.viewId,
    shouldLoadDefault,
  ]);

  return {
    views,
    saveView,
    defaultViewId,
    loading,
    updateView,
    updatedView,
    updatedId,
    deletedId,
    createdId,
    createdView,
    errorOnUpdate,
    errorOnFind,
    errorOnCreate: createError,
    shouldLoadDefault,
    makeDefault,
    sourceIsLoading,
    deleteView,
    loadingDefaultView,
    setCurrentView,
    currentView,
    loadDefaultView,
    find,
  };
};

export const SavedView = createContainer(useSavedView);
export const [SavedViewProvider, useSavedViewContext] = SavedView;

const encodeUrlState = (state: SavedViewUrlState) => {
  return savedViewUrlStateRT.encode(state);
};
const decodeUrlState = (value: unknown) => {
  const state = pipe(savedViewUrlStateRT.decode(value), fold(constant(undefined), identity));
  return state;
};
