/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '../../../../../../src/core/public';
import { StartDeps } from '../../plugin';
import {
  IEmbeddable,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
} from '../../../../../../src/plugins/embeddable/public';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { RendererStrings } from '../../../i18n';
import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { EmbeddableInput } from '../../expression_types';
import { RendererHandlers } from '../../../types';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';

const { embeddable: strings } = RendererStrings;

const embeddablesRegistry: {
  [key: string]: IEmbeddable;
} = {};

const renderEmbeddableFactory = (core: CoreStart, plugins: StartDeps) => {
  const I18nContext = core.i18n.Context;

  return (embeddableObject: IEmbeddable, domNode: HTMLElement) => {
    return (
      <div
        className={CANVAS_EMBEDDABLE_CLASSNAME}
        style={{ width: domNode.offsetWidth, height: domNode.offsetHeight, cursor: 'auto' }}
      >
        <I18nContext>
          <plugins.embeddable.EmbeddablePanel embeddable={embeddableObject} />
        </I18nContext>
      </div>
    );
  };
};

export const embeddableRendererFactory = (core: CoreStart, plugins: StartDeps) => {
  const renderEmbeddable = renderEmbeddableFactory(core, plugins);
  return () => ({
    name: 'embeddable',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      { input, embeddableType }: EmbeddableExpression<EmbeddableInput>,
      handlers: RendererHandlers
    ) => {
      const uniqueId = handlers.getElementId();

      if (!embeddablesRegistry[uniqueId]) {
        const factory = Array.from(plugins.embeddable.getEmbeddableFactories()).find(
          (embeddableFactory) => embeddableFactory.type === embeddableType
        ) as EmbeddableFactory<EmbeddableInput>;

        if (!factory) {
          handlers.done();
          throw new EmbeddableFactoryNotFoundError(embeddableType);
        }

        const embeddableObject = await factory.createFromSavedObject(input.id, input);

        embeddablesRegistry[uniqueId] = embeddableObject;
        ReactDOM.unmountComponentAtNode(domNode);

        const subscription = embeddableObject.getInput$().subscribe(function (updatedInput) {
          const updatedExpression = embeddableInputToExpression(updatedInput, embeddableType);

          if (updatedExpression) {
            handlers.onEmbeddableInputChange(updatedExpression);
          }
        });

        ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () =>
          handlers.done()
        );

        handlers.onResize(() => {
          ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () =>
            handlers.done()
          );
        });

        handlers.onDestroy(() => {
          subscription.unsubscribe();
          handlers.onEmbeddableDestroyed();

          delete embeddablesRegistry[uniqueId];

          return ReactDOM.unmountComponentAtNode(domNode);
        });
      } else {
        embeddablesRegistry[uniqueId].updateInput(input);
        embeddablesRegistry[uniqueId].reload();
      }
    },
  });
};
