/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesPlugin } from './plugin';

export { Space } from '../common/model/space';

export { GetSpaceResult } from '../common/model/types';

export { SpaceAvatar, getSpaceColor, getSpaceImageUrl, getSpaceInitials } from './space_avatar';

export { SpacesPluginSetup, SpacesPluginStart } from './plugin';

export { SpacesManager } from './spaces_manager';

export const plugin = () => {
  return new SpacesPlugin();
};
