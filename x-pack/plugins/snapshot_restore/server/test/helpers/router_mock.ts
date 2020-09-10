/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from '@elastic/safer-lodash-set';

type RequestHandler = (...params: any[]) => any;

type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

interface HandlersByUrl {
  [key: string]: RequestHandler;
}

const responseIntercepted = {
  ok(response: any) {
    return response;
  },
  conflict(response: any) {
    response.status = 409;
    return response;
  },
  internalError(response: any) {
    response.status = 500;
    return response;
  },
  notFound(response: any) {
    response.status = 404;
    return response;
  },
};

/**
 * Create a proxy with a default "catch all" handler to make sure we don't break route handlers that make use
 * of other method on the response object that the ones defined in `responseIntercepted` above.
 */
const responseMock = new Proxy(responseIntercepted, {
  get: (target: any, prop) => (prop in target ? target[prop] : (response: any) => response),
  has: () => true,
});

export interface RequestMock {
  method: RequestMethod;
  path: string;
  [key: string]: any;
}

export class RouterMock {
  /**
   * Cache to keep a reference to all the request handler defined on the router for each HTTP method and path
   */
  private cacheHandlers: { [key: string]: HandlersByUrl } = {
    get: {},
    post: {},
    put: {},
    delete: {},
    patch: {},
  };

  private _callAsCurrentUserCallCount = 0;
  private _callAsCurrentUserResponses: any[] = [];
  private contextMock = {};

  constructor(pathToESclient = 'core.elasticsearch.dataClient') {
    set(this.contextMock, pathToESclient, {
      callAsCurrentUser: this.callAsCurrentUser.bind(this),
    });
  }

  get({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.get[path] = handler;
  }

  post({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.post[path] = handler;
  }

  put({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.put[path] = handler;
  }

  delete({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.delete[path] = handler;
  }

  patch({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.patch[path] = handler;
  }

  private callAsCurrentUser() {
    const index = this._callAsCurrentUserCallCount;
    this._callAsCurrentUserCallCount += 1;
    const response = this._callAsCurrentUserResponses[index];

    return typeof response === 'function' ? Promise.resolve(response()) : Promise.resolve(response);
  }

  public set callAsCurrentUserResponses(responses: any[]) {
    this._callAsCurrentUserCallCount = 0;
    this._callAsCurrentUserResponses = responses;
  }

  runRequest({ method, path, ...mockRequest }: RequestMock) {
    const handler = this.cacheHandlers[method][path];

    if (typeof handler !== 'function') {
      throw new Error(`No route handler found for ${method.toUpperCase()} request at "${path}"`);
    }

    return handler(this.contextMock, mockRequest, responseMock);
  }
}
