/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
// XXX commenting this out because we're not a plugin any more
// XXX this leads to the untyped/any stuff below
// XX import { PluginCore } from '../plugin';

const CoreContext = createContext({});
const CoreProvider: React.FC<{ core: any }> = props => {
  const { core, ...restProps } = props;
  return <CoreContext.Provider value={core} {...restProps} />;
};

export { CoreContext, CoreProvider };
