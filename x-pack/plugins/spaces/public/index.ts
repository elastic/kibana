/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesPlugin } from './plugin';

export { SpaceAvatar, getSpaceColor, getSpaceImageUrl, getSpaceInitials } from './space_avatar';

export { SpacesPluginSetup, SpacesPluginStart } from './plugin';

export { SpacesManager } from './spaces_manager';

export { GetAllSpacesOptions, GetAllSpacesPurpose, GetSpaceResult } from '../common';

// re-export types from oss definition
export type { Space } from '../../../../src/plugins/spaces_oss/common';

export const plugin = () => {
  return new SpacesPlugin();
};
