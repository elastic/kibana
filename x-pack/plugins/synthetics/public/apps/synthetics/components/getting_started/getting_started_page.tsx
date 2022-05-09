/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { fetchServiceLocationsAction } from '../../state/monitor_management/service_locations';
import { SimpleMonitorForm } from './simple_monitor_form';

export const GettingStartedPage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchServiceLocationsAction({}));
  }, [dispatch]);

  return (
    <>
      <EuiEmptyPrompt
        title={<h2>Create a single page browser monitor</h2>}
        layout="horizontal"
        color="plain"
        body={
          <>
            <EuiText size="s">
              Or select a different monitor type to get started with Elastic Synthetics Monitoring
            </EuiText>
            <EuiSpacer />
            <SimpleMonitorForm />
          </>
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>For more information, read our</span>
            </EuiTitle>{' '}
            <EuiLink href="#" target="_blank">
              Getting Started Guide
            </EuiLink>
          </>
        }
      />
    </>
  );
};
