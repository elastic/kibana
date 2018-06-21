/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import uuid from 'uuid';
import { findNonExistentItems } from '../../utils/find_non_existent_items';

import {
  CMAssignmentReturn,
  CMBeat,
  CMBeatsAdapter,
  CMRemovalReturn,
  CMTagAssignment,
  FrameworkRequest,
} from '../lib';
import { CMTagsDomain } from './tags';

export class CMBeatsDomain {
  private adapter: CMBeatsAdapter;
  private tags: CMTagsDomain;

  constructor(adapter: CMBeatsAdapter, libs: { tags: CMTagsDomain }) {
    this.adapter = adapter;
    this.tags = libs.tags;
  }

  // TODO more strongly type this
  public async enrollBeat(
    beatId: string,
    remoteAddress: string,
    beat: Partial<CMBeat>
  ) {
    // TODO move this to the token lib
    const accessToken = uuid.v4().replace(/-/g, '');
    await this.adapter.insertBeat({
      ...beat,
      access_token: accessToken,
      host_ip: remoteAddress,
      id: beatId,
    } as CMBeat);
    return { accessToken };
  }

  public async removeTagsFromBeats(
    req: FrameworkRequest,
    removals: CMTagAssignment[]
  ): Promise<CMRemovalReturn> {
    const beatIds = uniq(removals.map(removal => removal.beatId));
    const tagIds = uniq(removals.map(removal => removal.tag));

    const response = {
      removals: removals.map(() => ({ status: null })),
    };

    const beats = await this.adapter.getBeatsWithIds(req, beatIds);
    const tags = await this.tags.getTagsWithIds(req, tagIds);

    // Handle assignments containing non-existing beat IDs or tags
    const nonExistentBeatIds = findNonExistentItems(beats, beatIds);
    const nonExistentTags = await findNonExistentItems(tags, tagIds);

    addNonExistentItemToResponse(
      response,
      removals,
      nonExistentBeatIds,
      nonExistentTags
    );

    // TODO abstract this
    const validRemovals = removals
      .map((removal, idxInRequest) => ({
        beatId: removal.beatId,
        idxInRequest, // so we can add the result of this removal to the correct place in the response
        tag: removal.tag,
      }))
      .filter((removal, idx) => response.removals[idx].status === null);

    if (validRemovals.length > 0) {
      const removalResults = await this.adapter.removeTagsFromBeats(
        req,
        validRemovals
      );
      return addToResultsToResponse('removals', response, removalResults);
    }
    return response;
  }

  public async getAllBeats(req: FrameworkRequest) {
    return await this.adapter.getBeats(req);
  }

  public async assignTagsToBeats(
    req: FrameworkRequest,
    assignments: CMTagAssignment[]
  ): Promise<CMAssignmentReturn> {
    const beatIds = uniq(assignments.map(assignment => assignment.beatId));
    const tagIds = uniq(assignments.map(assignment => assignment.tag));

    const response = {
      assignments: assignments.map(() => ({ status: null })),
    };
    const beats = await this.adapter.getBeatsWithIds(req, beatIds);
    const tags = await this.tags.getTagsWithIds(req, tagIds);

    // Handle assignments containing non-existing beat IDs or tags
    const nonExistentBeatIds = findNonExistentItems(beats, beatIds);
    const nonExistentTags = findNonExistentItems(tags, tagIds);

    // TODO break out back into route / function response
    // TODO causes function to error if a beat or tag does not exist
    addNonExistentItemToResponse(
      response,
      assignments,
      nonExistentBeatIds,
      nonExistentTags
    );

    // TODO abstract this
    const validAssignments = assignments
      .map((assignment, idxInRequest) => ({
        beatId: assignment.beatId,
        idxInRequest, // so we can add the result of this assignment to the correct place in the response
        tag: assignment.tag,
      }))
      .filter((assignment, idx) => response.assignments[idx].status === null);

    if (validAssignments.length > 0) {
      const assignmentResults = await this.adapter.assignTagsToBeats(
        req,
        validAssignments
      );

      // TODO This should prob not mutate
      return addToResultsToResponse('assignments', response, assignmentResults);
    }
    return response;
  }
}

// TODO abstract to the route
function addNonExistentItemToResponse(
  response,
  assignments,
  nonExistentBeatIds,
  nonExistentTags
) {
  assignments.forEach(({ beatId: beatId, tag }, idx) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(beatId);
    const isTagNonExistent = nonExistentTags.includes(tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[
        idx
      ].result = `Beat ${beatId} and tag ${tag} not found`;
    } else if (isBeatNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[idx].result = `Beat ${beatId} not found`;
    } else if (isTagNonExistent) {
      response.assignments[idx].status = 404;
      response.assignments[idx].result = `Tag ${tag} not found`;
    }
  });
}

// TODO dont mutate response
function addToResultsToResponse(key: string, response, assignmentResults) {
  assignmentResults.forEach(assignmentResult => {
    const { idxInRequest, status, result } = assignmentResult;
    response[key][idxInRequest].status = status;
    response[key][idxInRequest].result = result;
  });
  return response;
}
