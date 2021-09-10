/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MiddlewareAPI } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { LensAppState, setState } from '..';
import { updateLayer, updateVisualizationState, LensStoreDeps } from '..';
import { SharingSavedObjectProps } from '../../types';
import { LensEmbeddableInput, LensByReferenceInput } from '../../embeddable/embeddable';
import { getInitialDatasourceId } from '../../utils';
import { initializeDatasources } from '../../editor_frame_service/editor_frame';
import { generateId } from '../../id_generator';
import {
  getVisualizeFieldSuggestions,
  switchToSuggestion,
} from '../../editor_frame_service/editor_frame/suggestion_helpers';
import { LensAppServices } from '../../app_plugin/types';
import { getEditPath, getFullPath, LENS_EMBEDDABLE_TYPE } from '../../../common/constants';
import { Document, injectFilterReferences } from '../../persistence';

export const getPersisted = async ({
  initialInput,
  lensServices,
  history,
}: {
  initialInput: LensEmbeddableInput;
  lensServices: LensAppServices;
  history?: History<unknown>;
}): Promise<
  { doc: Document; sharingSavedObjectProps: Omit<SharingSavedObjectProps, 'errorJSON'> } | undefined
> => {
  const { notifications, spaces, attributeService } = lensServices;
  let doc: Document;

  try {
    const result = await attributeService.unwrapAttributes(initialInput);
    if (!result) {
      return {
        doc: ({
          ...initialInput,
          type: LENS_EMBEDDABLE_TYPE,
        } as unknown) as Document,
        sharingSavedObjectProps: {
          outcome: 'exactMatch',
        },
      };
    }
    const { sharingSavedObjectProps, ...attributes } = result;
    if (spaces && sharingSavedObjectProps?.outcome === 'aliasMatch' && history) {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = sharingSavedObjectProps?.aliasTargetId; // This is always defined if outcome === 'aliasMatch'
      const newPath = lensServices.http.basePath.prepend(
        `${getEditPath(newObjectId)}${history.location.search}`
      );
      await spaces.ui.redirectLegacyUrl(
        newPath,
        i18n.translate('xpack.lens.legacyUrlConflict.objectNoun', {
          defaultMessage: 'Lens visualization',
        })
      );
    }
    doc = {
      ...initialInput,
      ...attributes,
      type: LENS_EMBEDDABLE_TYPE,
    };

    return {
      doc,
      sharingSavedObjectProps: {
        aliasTargetId: sharingSavedObjectProps?.aliasTargetId,
        outcome: sharingSavedObjectProps?.outcome,
      },
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
  {
    redirectCallback,
    initialInput,
    emptyState,
    history,
  }: {
    redirectCallback: (savedObjectId?: string) => void;
    initialInput?: LensEmbeddableInput;
    emptyState?: LensAppState;
    history?: History<unknown>;
  }
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
  getPersisted({ initialInput, lensServices, history })
    .then(
      (persisted) => {
        if (persisted) {
          const { doc, sharingSavedObjectProps } = persisted;
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
                  sharingSavedObjectProps,
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
