/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

export const createAssignableTagsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags/assignable/{beatIds}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: any) => {
    const beatIdString: string = request.params.beatIds;
    const beatIds = beatIdString.split(',').filter((id: string) => id.length > 0);

    let tags: BeatTag[];
    try {
      const beats = await libs.beats.getByIds(request.user, beatIds);
      tags = await libs.tags.getNonConflictingTags(
        request.user,
        flatten(beats.map(beat => beat.tags))
      );
    } catch (err) {
      return wrapEsError(err);
    }

    return tags;
  },
});
