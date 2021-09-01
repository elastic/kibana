/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MiddlewareAPI } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { LensAppState, setState } from '..';
import { updateLayer, updateVisualizationState, LensStoreDeps } from '..';
import { LensEmbeddableInput, LensByReferenceInput } from '../../embeddable/embeddable';
import { getInitialDatasourceId } from '../../utils';
import { initializeDatasources } from '../../editor_frame_service/editor_frame';
import { generateId } from '../../id_generator';
import {
  getVisualizeFieldSuggestions,
  switchToSuggestion,
} from '../../editor_frame_service/editor_frame/suggestion_helpers';
import { LensAppServices } from '../../app_plugin/types';
import { getFullPath, LENS_EMBEDDABLE_TYPE } from '../../../common/constants';
import { Document, injectFilterReferences } from '../../persistence';

export const getPersisted = async ({
  initialInput,
  lensServices,
}: {
  initialInput: LensEmbeddableInput;
  lensServices: LensAppServices;
}): Promise<{ doc: Document } | undefined> => {
  const { notifications, attributeService } = lensServices;
  let doc: Document;

  try {
    const attributes = await attributeService.unwrapAttributes(initialInput);

    doc = {
      ...initialInput,
      ...attributes,
      type: LENS_EMBEDDABLE_TYPE,
    };

    return {
      doc,
    };
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.docLoadingError', {
        defaultMessage: 'Error loading saved document',
      })
    );
  }
};

export function loadInitial(
  store: MiddlewareAPI,
  {
    lensServices,
    datasourceMap,
    visualizationMap,
    embeddableEditorIncomingState,
    initialContext,
  }: LensStoreDeps,
  redirectCallback: (savedObjectId?: string) => void,
  initialInput?: LensEmbeddableInput,
  emptyState?: LensAppState
) {
  const { getState, dispatch } = store;
  const { attributeService, notifications, data, dashboardFeatureFlag } = lensServices;
  const { persistedDoc } = getState().lens;

  if (
    !initialInput ||
    (attributeService.inputIsRefType(initialInput) &&
      initialInput.savedObjectId === persistedDoc?.savedObjectId)
  ) {
    return initializeDatasources(
      datasourceMap,
      getState().lens.datasourceStates,
      undefined,
      initialContext,
      {
        isFullEditor: true,
      }
    )
      .then((result) => {
        const datasourceStates = Object.entries(result).reduce(
          (state, [datasourceId, datasourceState]) => ({
            ...state,
            [datasourceId]: {
              ...datasourceState,
              isLoading: false,
            },
          }),
          {}
        );
        dispatch(
          setState({
            ...emptyState,
            datasourceStates,
            isLoading: false,
          })
        );
        if (initialContext) {
          const selectedSuggestion = getVisualizeFieldSuggestions({
            datasourceMap,
            datasourceStates,
            visualizationMap,
            activeVisualizationId: Object.keys(visualizationMap)[0] || null,
            visualizationState: null,
            visualizeTriggerFieldContext: initialContext,
          });
          if (selectedSuggestion) {
            switchToSuggestion(dispatch, selectedSuggestion, 'SWITCH_VISUALIZATION');
          }
        }
        const activeDatasourceId = getInitialDatasourceId(datasourceMap);
        const visualization = getState().lens.visualization;
        const activeVisualization =
          visualization.activeId && visualizationMap[visualization.activeId];

        if (visualization.state === null && activeVisualization) {
          const newLayerId = generateId();

          const initialVisualizationState = activeVisualization.initialize(() => newLayerId);
          dispatch(
            updateLayer({
              datasourceId: activeDatasourceId!,
              layerId: newLayerId,
              updater: datasourceMap[activeDatasourceId!].insertLayer,
            })
          );
          dispatch(
            updateVisualizationState({
              visualizationId: activeVisualization.id,
              updater: initialVisualizationState,
            })
          );
        }
      })
      .catch((e: { message: string }) => {
        notifications.toasts.addDanger({
          title: e.message,
        });
        redirectCallback();
      });
  }
  getPersisted({ initialInput, lensServices })
    .then(
      (persisted) => {
        if (persisted) {
          const { doc } = persisted;
          if (attributeService.inputIsRefType(initialInput)) {
            lensServices.chrome.recentlyAccessed.add(
              getFullPath(initialInput.savedObjectId),
              doc.title,
              initialInput.savedObjectId
            );
          }
          // Don't overwrite any pinned filters
          data.query.filterManager.setAppFilters(
            injectFilterReferences(doc.state.filters, doc.references)
          );

          const docDatasourceStates = Object.entries(doc.state.datasourceStates).reduce(
            (stateMap, [datasourceId, datasourceState]) => ({
              ...stateMap,
              [datasourceId]: {
                isLoading: true,
                state: datasourceState,
              },
            }),
            {}
          );

          initializeDatasources(
            datasourceMap,
            docDatasourceStates,
            doc.references,
            initialContext,
            {
              isFullEditor: true,
            }
          )
            .then((result) => {
              const activeDatasourceId = getInitialDatasourceId(datasourceMap, doc);

              const currentSessionId = data.search.session.getSessionId();

              dispatch(
                setState({
                  query: doc.state.query,
                  searchSessionId:
                    dashboardFeatureFlag.allowByValueEmbeddables &&
                    Boolean(embeddableEditorIncomingState?.originatingApp) &&
                    !(initialInput as LensByReferenceInput)?.savedObjectId &&
                    currentSessionId
                      ? currentSessionId
                      : data.search.session.start(),
                  ...(!isEqual(persistedDoc, doc) ? { persistedDoc: doc } : null),
                  activeDatasourceId,
                  visualization: {
                    activeId: doc.visualizationType,
                    state: doc.state.visualization,
                  },
                  datasourceStates: Object.entries(result).reduce(
                    (state, [datasourceId, datasourceState]) => ({
                      ...state,
                      [datasourceId]: {
                        ...datasourceState,
                        isLoading: false,
                      },
                    }),
                    {}
                  ),
                  isLoading: false,
                })
              );
            })
            .catch((e: { message: string }) =>
              notifications.toasts.addDanger({
                title: e.message,
              })
            );
        } else {
          redirectCallback();
        }
      },
      () => {
        dispatch(
          setState({
            isLoading: false,
          })
        );
        redirectCallback();
      }
    )
    .catch((e: { message: string }) =>
      notifications.toasts.addDanger({
        title: e.message,
      })
    );
}
