/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef } from 'react';
import React from 'react';

import type { StartServicesAccessor } from '@kbn/core/public';

import { getCopyToSpaceFlyoutComponent } from '../copy_saved_objects_to_space';
import { getEmbeddableLegacyUrlConflict, getLegacyUrlConflict } from '../legacy_urls';
import type { PluginsStart } from '../plugin';
import { getShareToSpaceFlyoutComponent } from '../share_saved_objects_to_space';
import { getSpaceAvatarComponent } from '../space_avatar';
import { getSpaceListComponent } from '../space_list';
import { getSpacesContextProviderWrapper } from '../spaces_context';
import type { SpacesManager } from '../spaces_manager';
import { LazyWrapper } from './lazy_wrapper';
import type { SpacesApiUiComponent } from './types';

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
    getCopyToSpaceFlyout: wrapLazy(getCopyToSpaceFlyoutComponent, { showLoadingSpinner: false }),
    getSpaceList: wrapLazy(getSpaceListComponent),
    getEmbeddableLegacyUrlConflict: wrapLazy(() =>
      getEmbeddableLegacyUrlConflict({ spacesManager, getStartServices })
    ),
    getLegacyUrlConflict: wrapLazy(() => getLegacyUrlConflict({ getStartServices })),
    getSpaceAvatar: wrapLazy(getSpaceAvatarComponent),
  };
};
