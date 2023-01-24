/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  IEmbeddable,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { EmbeddableContainerContext } from '@kbn/embeddable-plugin/public';
import { StartDeps } from '../../plugin';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { RendererStrings } from '../../../i18n';
import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { RendererFactory, EmbeddableInput } from '../../../types';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';

const { embeddable: strings } = RendererStrings;

// registry of references to embeddables on the workpad
const embeddablesRegistry: {
  [key: string]: IEmbeddable | Promise<IEmbeddable>;
} = {};

const renderEmbeddableFactory = (core: CoreStart, plugins: StartDeps) => {
  const I18nContext = core.i18n.Context;
  const EmbeddableRenderer: FC<{ embeddable: IEmbeddable }> = ({ embeddable }) => {
    const currentAppId = useObservable(core.application.currentAppId$, undefined);

    if (!currentAppId) {
      return null;
    }

    const embeddableContainerContext: EmbeddableContainerContext = {
      getCurrentPath: () => {
        const urlToApp = core.application.getUrlForApp(currentAppId);
        const inAppPath = window.location.pathname.replace(urlToApp, '');

        return inAppPath + window.location.search + window.location.hash;
      },
    };

    return (
      <plugins.embeddable.EmbeddablePanel
        embeddable={embeddable}
        containerContext={embeddableContainerContext}
      />
    );
  };

  return (embeddableObject: IEmbeddable) => {
    return (
      <div
        className={CANVAS_EMBEDDABLE_CLASSNAME}
        style={{ width: '100%', height: '100%', cursor: 'auto' }}
      >
        <I18nContext>
          <KibanaThemeProvider theme$={core.theme.theme$}>
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
    render: async (domNode, { input, embeddableType }, handlers) => {
      const uniqueId = handlers.getElementId();
      const isByValueEnabled = plugins.presentationUtil.labsService.isProjectEnabled(
        'labs:canvas:byValueEmbeddable'
      );

      if (!embeddablesRegistry[uniqueId]) {
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
