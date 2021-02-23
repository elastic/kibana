/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RouteComponentProps } from 'react-router-dom';
import React, { FunctionComponent } from 'react';
import { Provider } from 'react-redux';

// @ts-ignore
import { rollupJobsStore } from './store';
import { RollupWizard as RollupWizardContainer } from './rollup_wizard.container';

export const RollupWizard: FunctionComponent<RouteComponentProps> = (props) => {
  return (
    <Provider store={rollupJobsStore}>
      <RollupWizardContainer {...props} />
    </Provider>
  );
};
