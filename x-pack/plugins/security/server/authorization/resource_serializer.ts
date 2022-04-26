/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const spaceResourcePrefix = `space:`;

export const packageResourcePrefix = `package:`;

export class ResourceSerializer {
  public static serializeSpaceResource(spaceId: string): string {
    return `${spaceResourcePrefix}${spaceId}`;
  }

  public static deserializeSpaceResource(resource: string): string {
    return resource.slice(spaceResourcePrefix.length);
  }

  public static isSerializedSpaceResource(resource: string): boolean {
    return resource.startsWith(spaceResourcePrefix);
  }

  // packageId can contain actions too in endpoint:isolate_host format
  public static serializePackageResource(packageId: string): string {
    return `${packageResourcePrefix}${packageId}`;
  }

  public static deserializePackageResource(resource: string): string {
    return resource.slice(packageResourcePrefix.length);
  }

  public static isSerializedPackageResource(resource: string): boolean {
    return resource.startsWith(packageResourcePrefix);
  }
}
