/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Everything in here should be moved to http://github.com/sqren/react-redux-request

declare module 'react-redux-request' {
  import React from 'react';

  // status and args are optional, especially for places that use initial data in a reducer
  export interface RRRRenderResponse<T, P = any[]> {
    status?: 'SUCCESS' | 'LOADING' | 'FAILURE';
    data: T;
    args?: P;
  }

  export type RRRRender<T, P = any[]> = (
    res: RRRRenderResponse<T, P>
  ) => JSX.Element | null;

  export interface RequestProps<T, P> {
    id: string;
    fn: (args: any) => Promise<any>;
    selector?: (state: any) => any;
    args?: any[];
    render?: RRRRender<T, P>;
  }

  export function reducer(state: any): any;

  export class Request<T, P = any[]> extends React.Component<
    RequestProps<T, P>
  > {}
}
