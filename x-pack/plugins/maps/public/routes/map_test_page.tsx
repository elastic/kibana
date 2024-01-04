/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import {
  CreateEmbeddableComponent,

  // you might need to export this in src/plugins/embeddable/public/index.ts
  EmbeddableComponentFactory,
} from '@kbn/embeddable-plugin/public';
import { PresentationPanel } from '@kbn/presentation-panel-plugin/public';
import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import { HasEditCapabilities, useApiPublisher } from '@kbn/presentation-publishing';

type MapApi = DefaultPresentationPanelApi &
  HasEditCapabilities & { someSpecialMapFunction: () => void };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MapInput {}

const mapEmbeddableFactory: EmbeddableComponentFactory<MapInput, MapApi> = {
  deserializeState: (state: unknown) => {
    /**
     * this is where you'd do any validation or type casting. This is also a good place to run
     * any migrations needed to ensure this state is of the latest version.
     */
    return state as MapInput;
  },
  getComponent: async (initialState: MapInput) => {
    /**
     * The getComponent function is async to ensure compatibility with lazy loading, and allow for
     * any other async initialization tasks. Here we simulate a timeout. If you need to load a saved object
     * because the input is by reference, you can do that here.
     *
     * This would also be a good place to set up the redux store.
     */
    await new Promise((r) => setTimeout(r, 3000));

    /**
     * Here we create the actual Component inline. This would be the equavalent of the
     *`Embeddable` class in the legacy system.
     */
    return CreateEmbeddableComponent((apiRef) => {
      /**
       * Implement all functions that need to be used externally here. Eventually this will include serialization and
       * diff-checking code for the Dashboard to use.
       */
      useApiPublisher(
        {
          /**
           * Imagine that we want the map to be edited inline. We can implement the HasEditCapabilities interface here.
           */
          getTypeDisplayName: () => 'Map',
          isEditingEnabled: () => true,
          onEdit: () => {
            console.log('edit me please');
            /**
             * Here we could open a flyout or modal to edit the embeddable.
             */
          },
          someSpecialMapFunction: () => {
            console.log('look at me, I am a special map function');
          },
        },
        apiRef
      );

      return (
        <>
          <EuiTitle>
            <h1>TODO: render map component</h1>
          </EuiTitle>
        </>
      );
    });
  },
};

export const MapTestPage = () => {
  /**
   * imagine we've loaded some raw unknown state from the panel in this Dashboard's input
   */
  const veryUnknownState: unknown = {};

  const mapInput = mapEmbeddableFactory.deserializeState(veryUnknownState);
  const componentPromise = mapEmbeddableFactory.getComponent(mapInput);

  return (
    <>
      <EuiTitle>
        <h1>Map Test Page</h1>
      </EuiTitle>
      
      <PresentationPanel<MapApi> Component={componentPromise} />
    </>
  );
};
