/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import type { EmbeddableAppContext } from '@kbn/embeddable-plugin/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  EmbeddablePanel,
  IEmbeddable,
  isErrorEmbeddable,
  reactEmbeddableRegistryHasKey,
  ReactEmbeddableRenderer,
} from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import { CANVAS_APP, CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';
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

const { embeddable: strings } = RendererStrings;

// registry of references to embeddables on the workpad
const embeddablesRegistry: {
  [key: string]: IEmbeddable | Promise<IEmbeddable>;
} = {};

const renderReactEmbeddable = (
  type: string,
  uuid: string,
  input: EmbeddableInput,
  container: CanvasContainerApi,
  handlers: RendererHandlers
) => {
  return (
    <ReactEmbeddableRenderer
      type={type}
      maybeId={uuid}
      parentApi={container as unknown as PresentationContainer}
      key={`${type}_${uuid}`}
      state={{ rawState: input }}
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

const renderEmbeddableFactory = (core: CoreStart, plugins: StartDeps) => {
  const I18nContext = core.i18n.Context;
  const EmbeddableRenderer: FC<{ embeddable: IEmbeddable }> = ({ embeddable }) => {
    const currentAppId = useObservable(core.application.currentAppId$, undefined);

    if (!currentAppId) {
      return null;
    }

    const canvasAppContext: EmbeddableAppContext = {
      getCurrentPath: () => {
        const urlToApp = core.application.getUrlForApp(currentAppId);
        const inAppPath = window.location.pathname.replace(urlToApp, '');

        return inAppPath + window.location.search + window.location.hash;
      },
      currentAppId: CANVAS_APP,
    };

    embeddable.getAppContext = () => canvasAppContext;

    return <EmbeddablePanel embeddable={embeddable} />;
  };

  return (embeddableObject: IEmbeddable) => {
    return (
      <div
        className={CANVAS_EMBEDDABLE_CLASSNAME}
        style={{ width: '100%', height: '100%', cursor: 'auto' }}
      >
        <I18nContext>
          <KibanaThemeProvider theme={{ theme$: core.theme.theme$ }}>
            <EmbeddableRenderer embeddable={embeddableObject} />
          </KibanaThemeProvider>
        </I18nContext>
      </div>
    );
  };
};

export const embeddableRendererFactory = (
  core: CoreStart,
  plugins: StartDeps
): RendererFactory<EmbeddableExpression<EmbeddableInput>> => {
  const renderEmbeddable = renderEmbeddableFactory(core, plugins);
  return () => ({
    name: 'embeddable',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (domNode, { input, embeddableType, canvasApi }, handlers) => {
      const uniqueId = handlers.getElementId();
      const isByValueEnabled = plugins.presentationUtil.labsService.isProjectEnabled(
        'labs:canvas:byValueEmbeddable'
      );

      if (reactEmbeddableRegistryHasKey(embeddableType)) {
        /**
         * Prioritize React embeddables
         */
        ReactDOM.render(
          renderReactEmbeddable(embeddableType, uniqueId, input, canvasApi, handlers),
          domNode,
          () => handlers.done()
        );

        handlers.onDestroy(() => {
          handlers.onEmbeddableDestroyed();
          return ReactDOM.unmountComponentAtNode(domNode);
        });
      } else if (!embeddablesRegistry[uniqueId]) {
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
