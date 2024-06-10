/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  EmbeddablePanel,
  IEmbeddable,
  isErrorEmbeddable,
  ReactEmbeddableRenderer,
} from '@kbn/embeddable-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { useSearchApi } from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { pluginServices } from '../../../public/services';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';
import { RendererStrings } from '../../../i18n';
import {
  CanvasContainerApi,
  EmbeddableInput,
  RendererFactory,
  RendererHandlers,
} from '../../../types';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { StartDeps } from '../../plugin';
import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { useGetAppContext } from './use_get_app_context';

const { embeddable: strings } = RendererStrings;

// registry of references to embeddables on the workpad
const embeddablesRegistry: {
  [key: string]: IEmbeddable | Promise<IEmbeddable>;
} = {};

const renderReactEmbeddable = ({
  type,
  uuid,
  input,
  container,
  handlers,
  core,
}: {
  type: string;
  uuid: string;
  input: EmbeddableInput;
  container: CanvasContainerApi;
  handlers: RendererHandlers;
  core: CoreStart;
}) => {
  // wrap in functional component to allow usage of hooks
  const RendererWrapper: FC<{}> = () => {
    const getAppContext = useGetAppContext(core);
    const searchApi = useSearchApi({ filters: input.filters });

    return (
      <ReactEmbeddableRenderer
        type={type}
        maybeId={uuid}
        getParentApi={(): CanvasContainerApi => ({
          ...container,
          getAppContext,
          getSerializedStateForChild: () => ({
            rawState: omit(input, ['disableTriggers', 'filters']),
          }),
          ...searchApi,
        })}
        key={`${type}_${uuid}`}
        onAnyStateChange={(newState) => {
          const newExpression = embeddableInputToExpression(
            newState.rawState as unknown as EmbeddableInput,
            type,
            undefined,
            true
          );
          if (newExpression) handlers.onEmbeddableInputChange(newExpression);
        }}
      />
    );
  };

  return (
    <KibanaRenderContextProvider {...core}>
      <div
        className={CANVAS_EMBEDDABLE_CLASSNAME}
        style={{ width: '100%', height: '100%', cursor: 'auto' }}
      >
        <RendererWrapper />
      </div>
    </KibanaRenderContextProvider>
  );
};

const renderEmbeddableFactory = (core: CoreStart, _plugins: StartDeps) => {
  const EmbeddableRenderer: FC<{ embeddable: IEmbeddable }> = ({ embeddable }) => {
    const getAppContext = useGetAppContext(core);

    embeddable.getAppContext = getAppContext;

    return <EmbeddablePanel embeddable={embeddable} />;
  };

  return (embeddableObject: IEmbeddable) => {
    return (
      <KibanaRenderContextProvider {...core}>
        <div
          className={CANVAS_EMBEDDABLE_CLASSNAME}
          style={{ width: '100%', height: '100%', cursor: 'auto' }}
        >
          <EmbeddableRenderer embeddable={embeddableObject} />
        </div>
      </KibanaRenderContextProvider>
    );
  };
};

export const embeddableRendererFactory = (
  core: CoreStart,
  plugins: StartDeps
): RendererFactory<EmbeddableExpression<EmbeddableInput> & { canvasApi: CanvasContainerApi }> => {
  const renderEmbeddable = renderEmbeddableFactory(core, plugins);
  return () => ({
    name: 'embeddable',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (domNode, { input, embeddableType, canvasApi }, handlers) => {
      const { embeddables } = pluginServices.getServices();
      const uniqueId = handlers.getElementId();
      const isByValueEnabled = plugins.presentationUtil.labsService.isProjectEnabled(
        'labs:canvas:byValueEmbeddable'
      );

      if (embeddables.reactEmbeddableRegistryHasKey(embeddableType)) {
        /**
         * Prioritize React embeddables
         */
        ReactDOM.render(
          renderReactEmbeddable({
            input,
            handlers,
            uuid: uniqueId,
            type: embeddableType,
            container: canvasApi,
            core,
          }),
          domNode,
          () => handlers.done()
        );

        handlers.onDestroy(() => {
          handlers.onEmbeddableDestroyed();
          return ReactDOM.unmountComponentAtNode(domNode);
        });
      } else if (!embeddablesRegistry[uniqueId]) {
        /**
         * Handle legacy embeddables - embeddable does not exist in registry
         */
        const factory = Array.from(plugins.embeddable.getEmbeddableFactories()).find(
          (embeddableFactory) => embeddableFactory.type === embeddableType
        ) as EmbeddableFactory<EmbeddableInput>;

        if (!factory) {
          handlers.done();
          throw new EmbeddableFactoryNotFoundError(embeddableType);
        }

        const embeddableInput = {
          ...input,
          id: uniqueId,
          executionContext: {
            type: 'canvas',
          },
        };

        const embeddablePromise = input.savedObjectId
          ? factory
              .createFromSavedObject(input.savedObjectId, embeddableInput)
              .then((embeddable) => {
                // stores embeddable in registrey
                embeddablesRegistry[uniqueId] = embeddable;
                return embeddable;
              })
          : factory.create(embeddableInput).then((embeddable) => {
              if (!embeddable || isErrorEmbeddable(embeddable)) {
                return;
              }
              // stores embeddable in registry
              embeddablesRegistry[uniqueId] = embeddable as IEmbeddable;
              return embeddable;
            });
        embeddablesRegistry[uniqueId] = embeddablePromise as Promise<IEmbeddable>;

        const embeddableObject = (await (async () => embeddablePromise)()) as IEmbeddable;

        const palettes = await plugins.charts.palettes.getPalettes();

        embeddablesRegistry[uniqueId] = embeddableObject;
        ReactDOM.unmountComponentAtNode(domNode);

        const subscription = embeddableObject.getInput$().subscribe(function (updatedInput) {
          const updatedExpression = embeddableInputToExpression(
            updatedInput,
            embeddableType,
            palettes,
            isByValueEnabled
          );

          if (updatedExpression) {
            handlers.onEmbeddableInputChange(updatedExpression);
          }
        });

        ReactDOM.render(renderEmbeddable(embeddableObject), domNode, () => handlers.done());

        handlers.onDestroy(() => {
          subscription.unsubscribe();
          handlers.onEmbeddableDestroyed();

          delete embeddablesRegistry[uniqueId];

          return ReactDOM.unmountComponentAtNode(domNode);
        });
      } else {
        /**
         * Handle legacy embeddables - embeddable already exists in registry
         */
        const embeddable = embeddablesRegistry[uniqueId];

        // updating embeddable input with changes made to expression or filters
        if ('updateInput' in embeddable) {
          embeddable.updateInput(input);
          embeddable.reload();
        }
      }
    },
  });
};
