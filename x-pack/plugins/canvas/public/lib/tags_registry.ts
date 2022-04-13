/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { Tag, TagSpec } from './tag';

class TagRegistry extends Registry<TagSpec, Tag> {
  public wrapper(obj: TagSpec) {
    return new Tag(obj);
  }
}

export const tagsRegistry = new TagRegistry();
