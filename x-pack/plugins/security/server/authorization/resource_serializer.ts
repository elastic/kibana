/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spaceResourcePrefix = `space:`;

export const packageResourcePrefix = `package:`;

export class ResourceSerializer {
  public static serializeSpaceResource(spaceId: string) {
    return `${spaceResourcePrefix}${spaceId}`;
  }

  public static deserializeSpaceResource(resource: string) {
    return resource.slice(spaceResourcePrefix.length);
  }

  public static isSerializedSpaceResource(resource: string) {
    return resource.startsWith(spaceResourcePrefix);
  }

  // could be made more generic to serialize any new resource type by passing type in function
  public static serializePackageResource(packageId: string) {
    return `${packageResourcePrefix}${packageId}`;
  }

  public static deserializePackageResource(resource: string) {
    return resource.slice(packageResourcePrefix.length);
  }

  public static isSerializedPackageResource(resource: string) {
    return resource.startsWith(packageResourcePrefix);
  }
}
