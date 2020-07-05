/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedHistory } from 'kibana/public';
import React from 'react';
import { TagsServiceContract, TagManager, KidService } from '../../services';

/* eslint-disable react-hooks/rules-of-hooks */

export interface Params {
  readonly tags: TagsServiceContract;
  readonly kid: KidService;
  readonly history: ScopedHistory;
}

export class TagsAppServices {
  public readonly tags: TagsServiceContract;
  public readonly manager: TagManager;
  public readonly kid: KidService;
  public readonly history: ScopedHistory;

  constructor(params: Params) {
    this.tags = params.tags;
    this.manager = params.tags.manager!;
    this.kid = params.kid;
    this.history = params.history;
  }

  public readonly useQueryParam = (
    key: string
  ): [string | null, (value: string | null) => void] => {
    const [value, setValue] = React.useState<string | null>(
      new URLSearchParams(location.search).get(key) || null
    );

    React.useEffect(() => {
      setValue(new URLSearchParams(location.search).get(key) || null);
      const unregister = this.history.listen((location) => {
        setValue(new URLSearchParams(location.search).get(key));
      });
      return () => unregister();
    }, [key]);

    const set = React.useCallback(
      (newValue: string | null) => {
        const params = new URLSearchParams(this.history.location.search);
        if (newValue === null) params.delete(key);
        else params.set(key, newValue);
        const search = params.toString();
        this.history.push({
          search,
        });
      },
      [key]
    );

    return [value, set];
  };
}
