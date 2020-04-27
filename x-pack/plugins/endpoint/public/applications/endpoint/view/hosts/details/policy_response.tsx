/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { EuiAccordion } from '@elastic/eui';
import styled from 'styled-components';
import { useHostSelector } from '../hooks';
import {
  policyResponseConfigurations,
  policyResponseActions,
} from '../../../store/hosts/selectors';

export const PolicyResponse = memo(() => {
  const responseConfig = useHostSelector(policyResponseConfigurations);
  // const responseActions = useHostSelector(policyResponseActions);
  return (
    <div>
      {Object.entries(responseConfig).map(([key, val]) => {
        return (
          <EuiAccordion id={key} buttonContent={key} key={key}>
            <p>{val.status}</p>
          </EuiAccordion>
        );
      })}
    </div>
  );
});
