/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { ApmHeader } from './';

storiesOf('shared/ApmHeader', module)
  .addDecorator((storyFn) => {
    return (
      <MockApmPluginContextWrapper>{storyFn()}</MockApmPluginContextWrapper>
    );
  })
  .add('Example', () => {
    return (
      <ApmHeader>
        <EuiTitle size="l">
          <h1>
            GET
            /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all
          </h1>
        </EuiTitle>
      </ApmHeader>
    );
  });
