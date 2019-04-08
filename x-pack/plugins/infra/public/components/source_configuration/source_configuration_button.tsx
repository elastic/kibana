/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import { WithSource } from '../../containers/with_source';
import { WithSourceConfigurationFlyoutState } from './source_configuration_flyout_state';

export const SourceConfigurationButton: React.SFC = () => (
  <WithSourceConfigurationFlyoutState>
    {({ toggle }) => (
      <WithSource>
        {({ configuration }) => (
          <EuiButtonEmpty
            aria-label="Configure source"
            color="text"
            iconType="gear"
            onClick={toggle}
          >
            {configuration && configuration.name}
          </EuiButtonEmpty>
        )}
      </WithSource>
    )}
  </WithSourceConfigurationFlyoutState>
);
