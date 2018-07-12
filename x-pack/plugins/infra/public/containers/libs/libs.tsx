/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { InfraFrontendLibs } from '../../lib/lib';

export const LibsContext = React.createContext<Partial<InfraFrontendLibs>>({});

export const withLibs = <P extends {}>(
  Component: React.ReactType<P & { libs: Partial<InfraFrontendLibs> }>
) => (props: P) => (
  <LibsContext.Consumer>{libs => <Component {...props} libs={libs} />}</LibsContext.Consumer>
);
