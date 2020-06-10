/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import createContainer from 'constate';
import { useCallback, useMemo, useState, useEffect, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { SimpleSavedObject, SavedObjectAttributes } from 'kibana/public';
import { useFindSavedObject } from '../../hooks/use_find_saved_object';
import { useCreateSavedObject } from '../../hooks/use_create_saved_object';
import { useDeleteSavedObject } from '../../hooks/use_delete_saved_object';
import { Source } from '../source';
import { metricsExplorerViewSavedObjectName } from '../../../common/saved_objects/metrics_explorer_view';
import { inventoryViewSavedObjectName } from '../../../common/saved_objects/inventory_view';
import { useSourceConfigurationFormState } from '../../components/source_configuration/source_configuration_form_state';
import { useGetSavedObject } from '../../hooks/use_get_saved_object';

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
}

export const useSavedView = (props: Props) => {
  const { source, sourceExists, createSourceConfiguration, updateSourceConfiguration } = useContext(
    Source.Context
  );
  const { viewType, defaultViewState } = props;
  type ViewState = typeof defaultViewState;
  const { data, loading, find, error: errorOnFind, hasView } = useFindSavedObject<
    SavedViewSavedObject<ViewState>
  >(viewType);

  const [currentView, setCurrentView] = useState<SavedView<any> | null>(null);
  const [loadingDefaultView, setLoadingDefaultView] = useState<boolean | null>(null);
  const { create, error: errorOnCreate, createdId } = useCreateSavedObject(viewType);
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
          defaultMessage: 'Hosts',
        }),
        id: '0',
        isDefault: !defaultViewId || defaultViewId === '0', // If there is no default view then hosts is the default
        ...defaultViewState,
      },
    ];

    savedObjects.forEach((o) => o.type === viewType && items.push(mapToView(o)));

    return items;
  }, [defaultViewState, savedObjects, viewType, defaultViewId, mapToView]);

  const loadDefaultView = useCallback(() => {
    // 0 viewId means default.
    if (!currentView && defaultViewId !== '0') {
      setLoadingDefaultView(true);
      getObject(defaultViewId);
    } else {
      setLoadingDefaultView(false);
    }
  }, [defaultViewId, setLoadingDefaultView, getObject, currentView]);

  useEffect(() => {
    if (currentViewSavedObject) {
      setCurrentView(mapToView(currentViewSavedObject));
      setLoadingDefaultView(false);
    }
  }, [currentViewSavedObject, defaultViewId, mapToView]);

  return {
    views,
    saveView,
    defaultViewId,
    loading,
    deletedId,
    createdId,
    errorOnFind,
    errorOnCreate: createError,
    makeDefault,
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
