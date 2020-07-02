/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Replace this logic with KibanaURL once it is available.
// https://github.com/elastic/kibana/issues/64497
export class KibanaURL {
  public readonly path: string;
  public readonly appName: string;
  public readonly appPath: string;

  constructor(path: string) {
    const match = path.match(/^.*\/app\/([^\/#]+)(.+)$/);

    if (!match) {
      throw new Error('Unexpected Discover URL path.');
    }

    const [, appName, appPath] = match;

    if (!appName || !appPath) {
      throw new Error('Could not parse Discover URL path.');
    }

    this.path = path;
    this.appName = appName;
    this.appPath = appPath;
  }
}
