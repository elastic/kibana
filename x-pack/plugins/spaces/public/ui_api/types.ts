/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';

import type { CoreStart } from 'src/core/public';

import type { CopyToSpaceFlyoutProps } from '../copy_saved_objects_to_space';
import type {
  EmbeddableLegacyUrlConflictProps,
  LegacyUrlConflictProps,
  RedirectLegacyUrlParams,
} from '../legacy_urls';
import type { ShareToSpaceFlyoutProps } from '../share_saved_objects_to_space';
import type { SpaceAvatarProps } from '../space_avatar';
import type { SpaceListProps } from '../space_list';
import type { SpacesContextProps, SpacesReactContextValue } from '../spaces_context';

/**
 * Function that returns a promise for a lazy-loadable component.
 */
export type LazyComponentFn<T> = (props: T) => ReactElement;

/**
 * UI components and services to add spaces capabilities to an application.
 */
export interface SpacesApiUi {
  /**
   * Lazy-loadable {@link SpacesApiUiComponent | React components} to support the Spaces feature.
   */
  components: SpacesApiUiComponent;
  /**
   * Redirect the user from a legacy URL to a new URL. This needs to be used if a call to `SavedObjectsClient.resolve()` results in an
   * `"aliasMatch"` outcome, which indicates that the user has loaded the page using a legacy URL. Calling this function will trigger a
   * client-side redirect to the new URL, and it will display a toast to the user.
   *
   * Consumers need to determine the local path for the new URL on their own, based on the object ID that was used to call
   * `SavedObjectsClient.resolve()` (old ID) and the object ID in the result (new ID). For example...
   *
   * The old object ID is `workpad-123` and the new object ID is `workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e`.
   *
   * Full legacy URL: `https://localhost:5601/app/canvas#/workpad/workpad-123/page/1`
   *
   * New URL path: `#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`
   *
   * The protocol, hostname, port, base path, and app path are automatically included.
   */
  redirectLegacyUrl: (params: RedirectLegacyUrlParams) => Promise<void>;
  /**
   * Helper function to easily access the Spaces React Context provider.
   */
  useSpaces<Services extends Partial<CoreStart>>(): SpacesReactContextValue<Services>;
}

/**
 * React UI components to be used to display the Spaces feature in any application.
 */
export interface SpacesApiUiComponent {
  /**
   * Provides a context that is required to render some Spaces components.
   */
  getSpacesContextProvider: LazyComponentFn<SpacesContextProps>;
  /**
   * Displays a flyout to edit the spaces that an object is shared to.
   *
   * Note: must be rendered inside of a SpacesContext.
   */
  getShareToSpaceFlyout: LazyComponentFn<ShareToSpaceFlyoutProps>;
  /**
   * Displays a flyout to copy an object to other spaces.
   *
   * Note: must be rendered inside of a SpacesContext.
   */
  getCopyToSpaceFlyout: LazyComponentFn<CopyToSpaceFlyoutProps>;
  /**
   * Displays a corresponding list of spaces for a given list of saved object namespaces. It shows up to five spaces (and an indicator for
   * any number of spaces that the user is not authorized to see) by default. If more than five named spaces would be displayed, the extras
   * (along with the unauthorized spaces indicator, if present) are hidden behind a button. If '*' (aka "All spaces") is present, it
   * supersedes all of the above and just displays a single badge without a button.
   *
   * Note: must be rendered inside of a SpacesContext.
   */
  getSpaceList: LazyComponentFn<SpaceListProps>;
  /**
   * Displays a callout that needs to be used if an embeddable component call to `SavedObjectsClient.resolve()` results in an `"conflict"`
   * outcome, which indicates that the user has loaded an embeddable which is associated directly with one object (A), *and* with a legacy
   * URL that points to a different object (B).
   */
  getEmbeddableLegacyUrlConflict: LazyComponentFn<EmbeddableLegacyUrlConflictProps>;
  /**
   * Displays a callout that needs to be used if a call to `SavedObjectsClient.resolve()` results in an `"conflict"` outcome, which
   * indicates that the user has loaded the page which is associated directly with one object (A), *and* with a legacy URL that points to a
   * different object (B).
   *
   * In this case, `SavedObjectsClient.resolve()` has returned object A. This component displays a warning callout to the user explaining
   * that there is a conflict, and it includes a button that will redirect the user to object B when clicked.
   *
   * Consumers need to determine the local path for the new URL on their own, based on the object ID that was used to call
   * `SavedObjectsClient.resolve()` (A) and the `alias_target_id` value in the response (B). For example...
   *
   * A is `workpad-123` and B is `workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e`.
   *
   * Full legacy URL: `https://localhost:5601/app/canvas#/workpad/workpad-123/page/1`
   *
   * New URL path: `#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`
   */
  getLegacyUrlConflict: LazyComponentFn<LegacyUrlConflictProps>;
  /**
   * Displays an avatar for the given space.
   */
  getSpaceAvatar: LazyComponentFn<SpaceAvatarProps>;
}
