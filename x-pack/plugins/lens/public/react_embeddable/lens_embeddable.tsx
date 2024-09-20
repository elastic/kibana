/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { DOC_TYPE } from '../../common/constants';
import {
  LensApi,
  LensEmbeddableStartServices,
  LensRuntimeState,
  LensSerializedState,
} from './types';

import { ExpressionWrapper } from './expression_wrapper';
import { loadEmbeddableData, hasExpressionParamsToRender } from './data_loader';
import { isTextBasedLanguage, deserializeState } from './helper';
import { UserMessages } from './user_messages/container';
import { useMessages } from './user_messages/use_messages';
import { initializeEditApi } from './initializers/inizialize_edit';
import { initializeInspector } from './initializers/initialize_inspector';
import { initializeLibraryServices } from './initializers/initialize_library_services';
import { initializeObservables } from './initializers/initialize_observables';
import { initializePanelSettings } from './initializers/initialize_panel_settings';
import { initializeSearchContext } from './initializers/initialize_search_context';
import { initializeData } from './initializers/initialize_data';
import { initializeVisualizationContext } from './initializers/initialize_visualization_context';
import { initializeActionApi } from './initializers/initialize_actions';
import { initializeIntegrations } from './initializers/initialize_integrations';
import { initializeStateManagement } from './initializers/initialize_state_management';
import { apiHasLensComponentCallbacks } from './renderer/type_guards';

export const createLensEmbeddableFactory = (
  services: LensEmbeddableStartServices
): ReactEmbeddableFactory<LensSerializedState, LensRuntimeState, LensApi> => {
  return {
    type: DOC_TYPE,
    /**
     * This is called before the build and will make sure that the
     * final state will contain the attributes object
     */
    deserializeState: async ({ rawState }) => deserializeState(services.attributeService, rawState),
    /**
     * This is called after the deserialize, so some assumptions can be made about its arguments:
     * @param state     the Lens "runtime" state, which means that 'attributes' is always present.
     *                  The difference for a by-value and a by-ref can be determined by the presence of 'savedObjectId' in the state
     * @param buildApi  a utility function to build the Lens API together to instrument the embeddable container on how to detect
     *                  significative changes in the state (i.e. worth a save or not)
     * @param uuid      a unique identifier for the embeddable panel
     * @param parentApi a set of props passed down from the embeddable container. Note: no assumptions can be made about its content
     *                  so the usage of type-guards is recommended before extracting data from it.
     *                  Due to the new embeddable being rendered by a <ReactEmbeddableRenderer /> wrapper, this is the only way
     *                  to pass data/props from a container.
     *                  Typical use cases is the forwarding of the unifiedSearch context to the embeddable, or the passing props
     *                  from the Lens component container to the Lens embeddable.
     * @returns an object with the Lens API and the React component to render in the Embeddable
     */
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      /**
       * Observables declared here are the bridge between the outer world
       * and the embeddable. They are updated within a subscribe callback
       * and will trigger a re-render of the component
       */
      const observables = initializeObservables(parentApi);
      // Build an helper to force a re-render for user messages
      const updateRenderCount = () =>
        observables.variables.renderCount$.next(observables.variables.renderCount$.getValue() + 1);

      const visualizationContextHelper = initializeVisualizationContext();

      /**
       * Initialize various configurations required to build all the required
       * parts for the Lens embeddable.
       * Each initialize call returns an object with the following properties:
       * - api: a set of methods or observables (also non-serializable) who can be picked up within the component
       * - serialize: a serializable subset of the Lens runtime state
       * - comparators: a set of comparators to help Dashboard determine if the state has changed since its saved state
       * - cleanup: a function to clean up any resources when the component is unmounted
       *
       * Mind: the getState argument is ok to pass as long as it is lazy evaluated (i.e. called within a function).
       * If there's something that should be immediately computed use the "state" deserialized variable.
       */
      const stateConfig = initializeStateManagement(state);
      const panelConfig = initializePanelSettings(state, parentApi);
      const inspectorConfig = initializeInspector(services);
      const editConfig = initializeEditApi(
        uuid,
        getState,
        stateConfig.api.updateState,
        isTextBasedLanguage,
        observables.variables,
        services,
        inspectorConfig.api,
        parentApi,
        state.savedObjectId
      );

      const libraryConfig = initializeLibraryServices(getState, services);
      const searchContextConfig = initializeSearchContext(state);
      const dataConfig = initializeData(getState, observables.variables);
      const integrationsConfig = initializeIntegrations(getState);
      const actionsConfig = initializeActionApi(
        uuid,
        state,
        getState,
        panelConfig.api,
        visualizationContextHelper,
        services
      );

      /**
       * This is useful to have always the latest version of the state
       * at hand when calling callbacks or performing actions
       */
      function getState(): LensRuntimeState {
        return {
          ...stateConfig.serialize(),
          ...panelConfig.serialize(),
          ...actionsConfig.serialize(),
          ...editConfig.serialize(),
          ...inspectorConfig.serialize(),
          ...libraryConfig.serialize(),
          ...searchContextConfig.serialize(),
          ...dataConfig.serialize(),
          ...integrationsConfig.serialize(),
        };
      }

      /**
       * Lens API is the object that can be passed to the final component/renderer and
       * provide access to the services for and by the outside world
       */
      const api: LensApi = buildApi(
        {
          ...panelConfig.api,
          ...editConfig.api,
          ...inspectorConfig.api,
          ...searchContextConfig.api,
          ...libraryConfig.api,
          ...dataConfig.api,
          ...actionsConfig.api,
          ...integrationsConfig.api,
          ...stateConfig.api,
        },
        {
          ...stateConfig.comparators,
          ...panelConfig.comparators,
          ...editConfig.comparators,
          ...inspectorConfig.comparators,
          ...searchContextConfig.comparators,
          ...observables.comparators,
          ...actionsConfig.comparators,
          ...integrationsConfig.comparators,
        }
      );

      // Compute the expression using the provided parameters
      // Inside a subscription will be updated based on each unifiedSearch change
      // and as side effect update few observables as  expressionParams$, expressionAbortController$ and renderCount$ with the new values upon updates
      const { getUserMessages, ...expression } = loadEmbeddableData(
        uuid,
        getState,
        api,
        parentApi,
        { ...observables.variables, ...stateConfig.variables },
        services,
        visualizationContextHelper,
        updateRenderCount
      );

      // the component is ready to load
      if (apiHasLensComponentCallbacks(parentApi)) {
        parentApi.onLoad?.(true);
      }

      return {
        api,
        Component: () => {
          // Pick up updated params from the observable
          const expressionParams = useStateFromPublishingSubject(
            observables.variables.expressionParams$
          );
          // used for functional tests
          const renderCount = useStateFromPublishingSubject(observables.variables.renderCount$);
          // used for reporting/functional tests
          const hasRendered = useStateFromPublishingSubject(
            observables.variables.hasRenderCompleted$
          );
          const canEdit = Boolean(
            api.isEditingEnabled?.() && observables.variables.viewMode$.getValue() === 'edit'
          );

          const [blockingErrors, warningOrErrors, infoMessages] = useMessages(
            getUserMessages,
            hasRendered
          );

          // On unmount call all the cleanups
          useEffect(() => {
            return () => {
              panelConfig.cleanup();
              editConfig.cleanup();
              inspectorConfig.cleanup();
              searchContextConfig.cleanup();
              dataConfig.cleanup();
              expression.cleanup();
              actionsConfig.cleanup();
              integrationsConfig.cleanup();
            };
          }, []);

          // Anything that can go wrong should show the error panel together with all the messages
          if (
            !services.spaces ||
            !hasExpressionParamsToRender(expressionParams) ||
            blockingErrors.length
          ) {
            return (
              <UserMessages
                blockingErrors={blockingErrors}
                warningOrErrors={warningOrErrors}
                infoMessages={infoMessages}
                canEdit={canEdit}
              />
            );
          }

          return (
            <div
              style={{ width: '100%', height: '100%' }}
              data-rendering-count={renderCount}
              data-render-complete={hasRendered}
              data-title={!api.hidePanelTitle?.getValue() ? api.panelTitle?.getValue() ?? '' : ''}
              data-description={api.panelDescription?.getValue() ?? ''}
              data-shared-item
            >
              <ExpressionWrapper {...expressionParams} />
              <UserMessages
                blockingErrors={blockingErrors}
                warningOrErrors={warningOrErrors}
                infoMessages={infoMessages}
                canEdit={canEdit}
              />
            </div>
          );
        },
      };
    },
  };
};
