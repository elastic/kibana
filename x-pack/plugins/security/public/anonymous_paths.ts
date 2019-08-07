/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

export class AnonymousPaths {
  private paths: Set<string>;

  constructor(private basePath: HttpSetup['basePath'], initialAnonymousPaths: string[]) {
    this.paths = new Set(initialAnonymousPaths);
  }

  public isAnonymous(path: string): boolean {
    return this.paths.has(this.basePath.remove(path));
  }

  public register(path: string) {
    this.paths.add(path);
  }
}
