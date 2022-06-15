/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { format } from 'url';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/server';
import { FILE_KIND_API_ROUTES } from '../../common/api_routes';

interface Dependencies {
  http: HttpServiceStart;
}

export class UploadEndpoint {
  constructor(private readonly http: HttpServiceStart) {}

  public get(fileKind: string, req: KibanaRequest): string {
    const { protocol, hostname, port } = this.http.getServerInfo();
    return format({
      protocol,
      hostname,
      port,
      pathname: `${this.http.basePath.get(req)}/${FILE_KIND_API_ROUTES.getUploadRoute(fileKind)}`,
    });
  }

  public static create({ http }: Dependencies) {
    return new UploadEndpoint(http);
  }
}

export const [getUploadEndpoint, setUploadEndpoint] =
  createGetterSetter<UploadEndpoint>('uploadEndpoint');
