/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from "../../../../common/constants";
import { isTypeSpaceAware } from "./is_type_space_aware";

function getClauseForType(spaceId, type) {
  const shouldFilterOnSpace = isTypeSpaceAware(type) && spaceId;
  const isDefaultSpace = spaceId === DEFAULT_SPACE_ID;

  const bool = {
    must: []
  };

  if (type) {
    bool.must.push({
      term: {
        type
      }
    });
  }

  if (shouldFilterOnSpace) {
    if (isDefaultSpace) {
      // The default space does not add its spaceId to the objects that belong to it, in order
      // to be compatible with installations that are not always space-aware.
      bool.must_not = [{
        exists: {
          field: "spaceId"
        }
      }];
    } else {
      bool.must.push({
        term: {
          spaceId
        }
      });
    }
  }

  return {
    bool
  };
}

export function getSpacesQueryParams(spaceId, types = []) {
  const typeClauses = types.map((type) => getClauseForType(spaceId, type));

  if (typeClauses.length > 0) {
    return {
      bool: {
        should: typeClauses,
        minimum_should_match: 1
      }
    };
  }

  return {};
}
