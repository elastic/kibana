/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Headers, KibanaRequest } from 'kibana/server';
import { BackendFrameworkAdapter, FrameworkUser } from './adapters/framework/adapter_types';
import { BeatsManagementConfigType } from '../../common';

export class BackendFrameworkLib {
  public log = this.adapter.log;
  public internalUser = this.adapter.internalUser;

  constructor(
    private readonly adapter: BackendFrameworkAdapter,
    private readonly config: BeatsManagementConfigType
  ) {
    this.validateConfig();
  }

  public getConfig(): BeatsManagementConfigType {
    return this.config;
  }

  public getUser(request: KibanaRequest): FrameworkUser<Headers> {
    return this.adapter.getUser(request);
  }

  /**
   * Expired `null` happens when we have no xpack info
   */
  public get license() {
    return {
      type: this.adapter.info ? this.adapter.info.license.type : 'unknown',
      expired: this.adapter.info ? this.adapter.info.license.expired : null,
    };
  }

  public get securityIsEnabled() {
    return this.adapter.info ? this.adapter.info.security.enabled : false;
  }

  private validateConfig() {
    const encryptionKey = this.config.encryptionKey;

    if (!encryptionKey) {
      this.adapter.log(
        'Using a default encryption key for xpack.beats.encryptionKey. It is recommended that you set xpack.beats.encryptionKey in kibana.yml with a unique token'
      );
    }
  }

  /*
  private wrapErrors(
    handler: (request: FrameworkRequest<any>) => Promise<BaseReturnType>
  ): (request: FrameworkRequest, h: ResponseToolkit) => Promise<ResponseObject> {
    return async (request: FrameworkRequest, h: ResponseToolkit) => {
      try {
        const result = await handler(request);
        if (!result.error) {
          return h.response(result);
        }
        return h
          .response({
            error: result.error,
            success: false,
          })
          .code(result.error.code || 400);
      } catch (err) {
        let statusCode = err.statusCode;

        // This is the only known non-status code error in the system, but just in case we have an else
        if (!statusCode && (err.message as string).includes('Invalid user type')) {
          statusCode = 403;
        } else {
          statusCode = 500;
        }

        if (statusCode === 403) {
          return h
            .response({
              error: {
                message: 'Insufficient user permissions for managing Beats configuration',
                code: 403,
              },
              success: false,
            })
            .code(403);
        }

        return h
          .response({
            error: {
              message: err.message,
              code: statusCode,
            },
            success: false,
          })
          .code(statusCode);
      }
    };
  }
  */
}
