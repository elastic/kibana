/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiEmptyPrompt,
  EuiImage,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';

import { getSourcesPath, getAddPath } from '../../../../routes';

import { SourcesLogic } from '../../sources_logic';

import illustration from './illustration.svg';

export const BYOSourcePrompt: React.FC = () => {
  const { externalConfigured } = useValues(SourcesLogic);

  return (
    <EuiEmptyPrompt
      icon={<EuiImage size="l" src={illustration} alt="" />}
      title={<h2>Don&apos;t see what you&apos;re looking for?</h2>}
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>Build and deploy your own custom connector package.</p>
          <p>
            Read our <EuiLink>documentation</EuiLink> to learn more about our
            <EuiLink>Connector Package Framework</EuiLink>
          </p>
        </>
      }
      actions={
        <>
          {externalConfigured && (
            <EuiText size="m" color="warning">
              <p>
                <i>You&apos;ve already configured an external connector</i>
              </p>
            </EuiText>
          )}
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonTo
                to={getSourcesPath(getAddPath('external'), true) + '/connector_registration'}
                color="primary"
                fill
                isDisabled={externalConfigured}
              >
                Register Your Deployment
              </EuiButtonTo>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonTo
                to={getSourcesPath(getAddPath('external'), true) + '/intro'}
                color="primary"
              >
                Learn More
              </EuiButtonTo>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
    />
  );
};
