/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const spaceResourcePrefix = `space:`;

export class ResourceSerializer {
  public static serializeSpaceResource(spaceId: string) {
    return `${spaceResourcePrefix}${spaceId}`;
  }

  public static deserializeSpaceResource(resource: string) {
    if (!this.isSerializedSpaceResource(resource)) {
      throw new Error(`Resource should have started with ${spaceResourcePrefix}`);
    }

    return resource.slice(spaceResourcePrefix.length);
  }

  public static isSerializedSpaceResource(resource: string) {
    return resource.startsWith(spaceResourcePrefix);
  }
}
