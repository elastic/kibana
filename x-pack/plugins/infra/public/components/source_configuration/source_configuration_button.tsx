/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useContext } from 'react';

import { Source } from '../../containers/source';
import { SourceConfigurationFlyoutState } from './source_configuration_flyout_state';

export const SourceConfigurationButton: React.FunctionComponent = () => {
  const { toggleIsVisible } = useContext(SourceConfigurationFlyoutState.Context);
  const { source } = useContext(Source.Context);

  return (
    <EuiButtonEmpty
      aria-label="Configure source"
      color="text"
      data-test-subj="configureSourceButton"
      iconType="gear"
      onClick={toggleIsVisible}
    >
      {source && source.configuration && source.configuration.name}
    </EuiButtonEmpty>
  );
};
