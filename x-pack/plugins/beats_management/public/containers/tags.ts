/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Container } from 'unstated';
import { BeatTag } from '../../common/domain_types';
import { FrontendLibs } from '../lib/types';

interface ContainerState {
  list: BeatTag[];
}

export class TagsContainer extends Container<ContainerState> {
  private query?: string;
  constructor(private readonly libs: FrontendLibs) {
    super();
    this.state = {
      list: [],
    };
  }
  public reload = async (kuery?: string) => {
    if (kuery) {
      this.query = await this.libs.elasticsearch.convertKueryToEsQuery(kuery);
    } else {
      this.query = undefined;
    }

    const tags = await this.libs.tags.getAll(this.query);

    this.setState({
      list: tags,
    });
  };

  public delete = async (tags: BeatTag[]) => {
    const tagIds = tags.map((tag: BeatTag) => tag.id);
    const success = await this.libs.tags.delete(tagIds);
    if (success) {
      this.reload(this.query);
    }
    return success;
  };
}
