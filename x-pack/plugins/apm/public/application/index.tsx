/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import 'react-vis/dist/style.css';
import { APP_WRAPPER_CLASS } from '../../../../../src/core/public';
import { ApmAppRoot, ApmAppRootProps } from '../components/routing/app_root';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticDataView } from '../services/rest/data_view';
import { setHelpExtension } from '../setHelpExtension';
import { setReadonlyBadge } from '../updateBadge';

/**
 * This module is rendered asynchronously in the Kibana platform.
 */
export const renderApp = (props: ApmAppRootProps) => {
  const { appMountParameters, coreStart } = props;
  const { element } = appMountParameters;

  // render APM feedback link in global help menu
  setHelpExtension(coreStart);
  setReadonlyBadge(coreStart);
  createCallApmApi(coreStart);

  // Automatically creates static data view and stores as saved object
  createStaticDataView().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static data view', e);
  });

  // add .kbnAppWrappers class to root element
  element.classList.add(APP_WRAPPER_CLASS);

  ReactDOM.render(<ApmAppRoot {...props} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
