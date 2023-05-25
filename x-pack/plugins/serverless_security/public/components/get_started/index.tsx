/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';

import { ServerlessSecurityPluginStartDependencies } from '../../types';
import { KibanaServicesProvider } from '../../services';
import type { GetStartedESSComponentProps, GetStartedESSComponent } from './types';

// export const getSecurityGetStartedESSComponent = (
//   core: CoreStart,
//   pluginsStart: ServerlessSecurityPluginStartDependencies
// ): GetStartedESSComponent => {
//   return (_props: GetStartedESSComponentProps) => (
//     <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
//       <div>I am a serveless get started page!</div>
//     </KibanaServicesProvider>
//   );
// };

export const getSecurityGetStartedESSComponent = (): GetStartedESSComponent => {
  return (_props?: GetStartedESSComponentProps) => <div>I am a serveless get started page!</div>;
};
