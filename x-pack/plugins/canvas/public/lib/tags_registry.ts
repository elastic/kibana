/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/common';
import { Tag, TagSpec } from './tag';

class TagRegistry extends Registry<TagSpec, Tag> {
  public wrapper(obj: TagSpec) {
    return new Tag(obj);
  }
}

export const tagsRegistry = new TagRegistry();
