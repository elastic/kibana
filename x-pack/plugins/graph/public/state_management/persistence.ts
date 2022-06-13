/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, call, put, select, cps } from 'redux-saga/effects';
import { GraphWorkspaceSavedObject, IndexPatternSavedObject, Workspace } from '../types';
import { GraphStoreDependencies, GraphState, submitSearch } from '.';
import { datasourceSelector } from './datasource';
import { setDatasource, IndexpatternDatasource } from './datasource';
import { loadFields, selectedFieldsSelector } from './fields';
import { updateSettings, settingsSelector } from './advanced_settings';
import { loadTemplates, templatesSelector } from './url_templates';
import {
  migrateLegacyIndexPatternRef,
  savedWorkspaceToAppState,
  appStateToSavedWorkspace,
  lookupIndexPatternId,
} from '../services/persistence';
import { updateMetaData, metaDataSelector } from './meta_data';
import { openSaveModal, SaveWorkspaceHandler } from '../services/save_modal';
import { getEditPath } from '../services/url';
import { saveSavedWorkspace } from '../helpers/saved_workspace_utils';
import type { DataView } from '../../../../../src/plugins/data_views/public';

export interface LoadSavedWorkspacePayload {
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  urlQuery: string | null;
}

const actionCreator = actionCreatorFactory('x-pack/graph');

export const loadSavedWorkspace = actionCreator<LoadSavedWorkspacePayload>('LOAD_WORKSPACE');
export const saveWorkspace = actionCreator<GraphWorkspaceSavedObject>('SAVE_WORKSPACE');
export const fillWorkspace = actionCreator<void>('FILL_WORKSPACE');

/**
 * Saga handling loading of a saved workspace.
 *
 * It will load the index pattern associated with the saved object and deserialize all properties
 * into the store. Existing state will be overwritten.
 */
export const loadingSaga = ({
  createWorkspace,
  notifications,
  indexPatternProvider,
}: GraphStoreDependencies) => {
  function* deserializeWorkspace(action: Action<LoadSavedWorkspacePayload>): Generator {
    const { indexPatterns, savedWorkspace, urlQuery } = action.payload;
    const migrationStatus = migrateLegacyIndexPatternRef(savedWorkspace, indexPatterns);
    if (!migrationStatus.success) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
          defaultMessage: 'Data view "{name}" not found',
          values: {
            name: migrationStatus.missingIndexPattern,
          },
        })
      );
      return;
    }

    const selectedIndexPatternId = lookupIndexPatternId(savedWorkspace);
    let indexPattern;
    try {
      indexPattern = (yield call(indexPatternProvider.get, selectedIndexPatternId)) as DataView;
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
          defaultMessage: 'Data view "{name}" not found',
          values: {
            name: selectedIndexPatternId,
          },
        })
      );
      return;
    }
    const initialSettings = settingsSelector((yield select()) as GraphState);

    const createdWorkspace = createWorkspace(indexPattern.title, initialSettings);

    const { urlTemplates, advancedSettings, allFields } = savedWorkspaceToAppState(
      savedWorkspace,
      indexPattern,
      createdWorkspace
    );

    // put everything in the store
    yield put(
      updateMetaData({
        title: savedWorkspace.title,
        description: savedWorkspace.description,
        savedObjectId: savedWorkspace.id,
      })
    );
    yield put(
      setDatasource({
        type: 'indexpattern',
        id: indexPattern.id!,
        title: indexPattern.title,
      })
    );
    yield put(loadFields(allFields));
    yield put(updateSettings(advancedSettings));
    yield put(loadTemplates(urlTemplates));

    if (urlQuery) {
      yield put(submitSearch(urlQuery));
    }

    createdWorkspace.runLayout();
  }

  return function* () {
    yield takeLatest(loadSavedWorkspace.match, deserializeWorkspace);
  };
};

/**
 * Saga handling saving of current state.
 *
 * It will serialize everything and save it using the saved objects client
 */
export const savingSaga = (deps: GraphStoreDependencies) => {
  function* persistWorkspace(action: Action<GraphWorkspaceSavedObject>) {
    const savedWorkspace = action.payload;
    const state: GraphState = yield select();
    const workspace = deps.getWorkspace();
    const selectedDatasource = datasourceSelector(state).current;
    if (!workspace || selectedDatasource.type === 'none') {
      return;
    }

    const savedObjectId = (yield cps(showModal, {
      deps,
      workspace,
      savedWorkspace,
      state,
      selectedDatasource,
    })) as string;
    if (savedObjectId) {
      yield put(updateMetaData({ savedObjectId }));
    }
  }

  return function* () {
    yield takeLatest(saveWorkspace.match, persistWorkspace);
  };
};

function showModal(
  {
    deps,
    workspace,
    savedWorkspace,
    state,
    selectedDatasource,
  }: {
    deps: GraphStoreDependencies;
    workspace: Workspace;
    savedWorkspace: GraphWorkspaceSavedObject;
    state: GraphState;
    selectedDatasource: IndexpatternDatasource;
  },
  savingCallback: (error: unknown, id?: string) => void
) {
  const saveWorkspaceHandler: SaveWorkspaceHandler = async (
    saveOptions,
    userHasConfirmedSaveWorkspaceData,
    services
  ) => {
    const canSaveData =
      deps.savePolicy === 'configAndData' ||
      (deps.savePolicy === 'configAndDataWithConsent' && userHasConfirmedSaveWorkspaceData);
    appStateToSavedWorkspace(
      savedWorkspace,
      {
        workspace,
        urlTemplates: templatesSelector(state),
        advancedSettings: settingsSelector(state),
        selectedIndex: selectedDatasource,
        selectedFields: selectedFieldsSelector(state),
      },
      canSaveData
    );
    try {
      const id = await saveSavedWorkspace(savedWorkspace, saveOptions, services);
      if (id) {
        const title = i18n.translate('xpack.graph.saveWorkspace.successNotificationTitle', {
          defaultMessage: 'Saved "{workspaceTitle}"',
          values: { workspaceTitle: savedWorkspace.title },
        });
        let text;
        if (!canSaveData && workspace.nodes.length > 0) {
          text = i18n.translate('xpack.graph.saveWorkspace.successNotification.noDataSavedText', {
            defaultMessage: 'The configuration was saved, but the data was not saved',
          });
        }
        deps.notifications.toasts.addSuccess({
          title,
          text,
          'data-test-subj': 'saveGraphSuccess',
        });
        if (savedWorkspace.id !== metaDataSelector(state).savedObjectId) {
          deps.changeUrl(getEditPath(savedWorkspace));
        }
      }
      savingCallback(null, id);
      return { id };
    } catch (error) {
      deps.notifications.toasts.addDanger(
        i18n.translate('xpack.graph.saveWorkspace.savingErrorMessage', {
          defaultMessage: 'Failed to save workspace: {message}',
          values: {
            message: error,
          },
        })
      );
      return { error };
    }
  };

  openSaveModal({
    savePolicy: deps.savePolicy,
    hasData: workspace.nodes.length > 0 || workspace.blocklistedNodes.length > 0,
    workspace: savedWorkspace,
    showSaveModal: deps.showSaveModal,
    saveWorkspace: saveWorkspaceHandler,
    I18nContext: deps.I18nContext,
    services: {
      savedObjectsClient: deps.savedObjectsClient,
      overlays: deps.overlays,
    },
  });
}
