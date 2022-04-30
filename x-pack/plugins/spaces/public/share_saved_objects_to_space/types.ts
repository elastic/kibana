/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsImportResponse, SavedObjectsImportRetry } from 'src/core/public';

export interface ShareOptions {
  selectedSpaceIds: string[];
  initiallySelectedSpaceIds: string[];
}

export type ImportRetry = Omit<SavedObjectsImportRetry, 'replaceReferences'>;

export interface ShareSavedObjectsToSpaceResponse {
  [spaceId: string]: SavedObjectsImportResponse;
}

/**
 * Properties for the ShareToSpaceFlyout.
 */
export interface ShareToSpaceFlyoutProps {
  /**
   * The object to render the flyout for.
   */
  savedObjectTarget: ShareToSpaceSavedObjectTarget;
  /**
   * The EUI icon that is rendered in the flyout's title.
   *
   * Default is 'share'.
   */
  flyoutIcon?: string;
  /**
   * The string that is rendered in the flyout's title.
   *
   * Default is 'Edit spaces for object'.
   */
  flyoutTitle?: string;
  /**
   * When enabled, if the object is not yet shared to multiple spaces, a callout will be displayed that suggests the user might want to
   * create a copy instead.
   *
   * Default value is false.
   */
  enableCreateCopyCallout?: boolean;
  /**
   * When enabled, if no other spaces exist _and_ the user has the appropriate privileges, a sentence will be displayed that suggests the
   * user might want to create a space.
   *
   * Default value is false.
   */
  enableCreateNewSpaceLink?: boolean;
  /**
   * When set to 'within-space' (default), the flyout behaves like it is running on a page within the active space, and it will prevent the
   * user from removing the object from the active space.
   *
   * Conversely, when set to 'outside-space', the flyout behaves like it is running on a page outside of any space, so it will allow the
   * user to remove the object from the active space.
   */
  behaviorContext?: 'within-space' | 'outside-space';
  /**
   * Optional handler that is called when the user has saved changes and there are spaces to be added to and/or removed from the object and
   * its relatives. If this is not defined, a default handler will be used that calls `/api/spaces/_update_objects_spaces` and displays a
   * toast indicating what occurred.
   */
  changeSpacesHandler?: (
    objects: Array<{ type: string; id: string }>,
    spacesToAdd: string[],
    spacesToRemove: string[]
  ) => Promise<void>;
  /**
   * Optional callback when the target object and its relatives are updated.
   */
  onUpdate?: (updatedObjects: Array<{ type: string; id: string }>) => void;
  /**
   * Optional callback when the flyout is closed.
   */
  onClose?: () => void;
}

/**
 * Describes the target saved object during a share operation.
 */
export interface ShareToSpaceSavedObjectTarget {
  /**
   * The object's type.
   */
  type: string;
  /**
   * The object's ID.
   */
  id: string;
  /**
   * The namespaces that the object currently exists in.
   */
  namespaces: string[];
  /**
   * The EUI icon that is rendered in the flyout's subtitle.
   *
   * Default is 'empty'.
   */
  icon?: string;
  /**
   * The string that is rendered in the flyout's subtitle.
   *
   * Default is `${type} [id=${id}]`.
   */
  title?: string;
  /**
   * The string that is used to describe the object in several places, e.g., _Make **object** available in selected spaces only_.
   *
   * Default value is 'object'.
   */
  noun?: string;
}
