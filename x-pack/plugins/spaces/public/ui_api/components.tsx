/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef } from 'react';
import React from 'react';

import type { StartServicesAccessor } from 'src/core/public';
import type { SpacesApiUiComponent } from 'src/plugins/spaces_oss/public';

import type { PluginsStart } from '../plugin';
import {
  getLegacyUrlConflict,
  getShareToSpaceFlyoutComponent,
} from '../share_saved_objects_to_space';
import { getSpaceAvatarComponent } from '../space_avatar';
import { getSpaceListComponent } from '../space_list';
import { getSpacesContextProviderWrapper } from '../spaces_context';
import type { SpacesManager } from '../spaces_manager';
import { LazyWrapper } from './lazy_wrapper';

export interface GetComponentsOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getComponents = ({
  spacesManager,
  getStartServices,
}: GetComponentsOptions): SpacesApiUiComponent => {
  /**
   * Returns a function that creates a lazy-loading version of a component.
   */
  function wrapLazy<T>(fn: () => Promise<FC<T>>, options: { showLoadingSpinner?: boolean } = {}) {
    const { showLoadingSpinner } = options;
    return (props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>) => (
      <LazyWrapper
        fn={fn}
        getStartServices={getStartServices}
        props={props}
        showLoadingSpinner={showLoadingSpinner}
      />
    );
  }

  return {
    getSpacesContextProvider: wrapLazy(() =>
      getSpacesContextProviderWrapper({ spacesManager, getStartServices })
    ),
    getShareToSpaceFlyout: wrapLazy(getShareToSpaceFlyoutComponent, { showLoadingSpinner: false }),
    getSpaceList: wrapLazy(getSpaceListComponent),
    getLegacyUrlConflict: wrapLazy(() => getLegacyUrlConflict({ getStartServices })),
    getSpaceAvatar: wrapLazy(getSpaceAvatarComponent),
  };
};
