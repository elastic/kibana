/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  CMDomainLibs,
  CMRemovalReturn,
  CMTagAssignment,
  FrameworkRequest,
} from '../lib';

export class CMBeatsDomain {
  private adapter: CMBeatsAdapter;
  private tags: CMDomainLibs['tags'];
  private tokens: CMDomainLibs['tokens'];

  constructor(
    adapter: CMBeatsAdapter,
    libs: { tags: CMDomainLibs['tags']; tokens: CMDomainLibs['tokens'] }
  ) {
    this.adapter = adapter;
    this.tags = libs.tags;
    this.tokens = libs.tokens;
  }

  public async update(
    beatId: string,
    accessToken: string,
    beatData: Partial<CMBeat>
  ) {
    const beat = await this.adapter.get(beatId);

    // TODO make return type enum
    if (beat === null) {
      return 'beat-not-found';
    }

    const isAccessTokenValid = this.tokens.areTokensEqual(
      beat.access_token,
      accessToken
    );
    if (!isAccessTokenValid) {
      return 'invalid-access-token';
    }
    const isBeatVerified = beat.hasOwnProperty('verified_on');
    if (!isBeatVerified) {
      return 'beat-not-verified';
    }

    await this.adapter.update({
      ...beat,
      ...beatData,
    });
  }

  // TODO more strongly type this
  public async enrollBeat(
    beatId: string,
    remoteAddress: string,
    beat: Partial<CMBeat>
  ) {
    // TODO move this to the token lib
    const accessToken = uuid.v4().replace(/-/g, '');
    await this.adapter.insert({
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

    const beats = await this.adapter.getWithIds(req, beatIds);
    const tags = await this.tags.getTagsWithIds(req, tagIds);

    // Handle assignments containing non-existing beat IDs or tags
    const nonExistentBeatIds = findNonExistentItems(beats, beatIds);
    const nonExistentTags = await findNonExistentItems(tags, tagIds);

    addNonExistentItemToResponse(
      response,
      removals,
      nonExistentBeatIds,
      nonExistentTags,
      'removals'
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
    return await this.adapter.getAll(req);
  }

  // TODO cleanup return value, should return a status enum
  public async verifyBeats(req: FrameworkRequest, beatIds: string[]) {
    const beatsFromEs = await this.adapter.getVerifiedWithIds(req, beatIds);

    const nonExistentBeatIds = beatsFromEs.reduce(
      (nonExistentIds: any, beatFromEs: any, idx: any) => {
        if (!beatFromEs.found) {
          nonExistentIds.push(beatIds[idx]);
        }
        return nonExistentIds;
      },
      []
    );

    const alreadyVerifiedBeatIds = beatsFromEs
      .filter((beat: any) => beat.found)
      .filter((beat: any) => beat._source.beat.hasOwnProperty('verified_on'))
      .map((beat: any) => beat._source.beat.id);

    const toBeVerifiedBeatIds = beatsFromEs
      .filter((beat: any) => beat.found)
      .filter((beat: any) => !beat._source.beat.hasOwnProperty('verified_on'))
      .map((beat: any) => beat._source.beat.id);

    const verifications = await this.adapter.verifyBeats(
      req,
      toBeVerifiedBeatIds
    );
    return {
      alreadyVerifiedBeatIds,
      nonExistentBeatIds,
      toBeVerifiedBeatIds,
      verifications,
    };
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
    const beats = await this.adapter.getWithIds(req, beatIds);
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
      nonExistentTags,
      'assignments'
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

// TODO abstract to the route, also the key arg is a temp fix
function addNonExistentItemToResponse(
  response: any,
  assignments: any,
  nonExistentBeatIds: any,
  nonExistentTags: any,
  key: string
) {
  assignments.forEach(({ beatId, tag }: CMTagAssignment, idx: any) => {
    const isBeatNonExistent = nonExistentBeatIds.includes(beatId);
    const isTagNonExistent = nonExistentTags.includes(tag);

    if (isBeatNonExistent && isTagNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Beat ${beatId} and tag ${tag} not found`;
    } else if (isBeatNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Beat ${beatId} not found`;
    } else if (isTagNonExistent) {
      response[key][idx].status = 404;
      response[key][idx].result = `Tag ${tag} not found`;
    }
  });
}

// TODO dont mutate response
function addToResultsToResponse(
  key: string,
  response: any,
  assignmentResults: any
) {
  assignmentResults.forEach((assignmentResult: any) => {
    const { idxInRequest, status, result } = assignmentResult;
    response[key][idxInRequest].status = status;
    response[key][idxInRequest].result = result;
  });
  return response;
}
