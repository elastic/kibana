/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Link } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';

import {
  getSourcesPath,
  ADD_SOURCE_PATH,
  SECURITY_PATH,
  PRIVATE_SOURCES_DOCS_URL,
} from '../../../../routes';

interface ConfigCompletedProps {
  header: React.ReactNode;
  name: string;
  accountContextOnly?: boolean;
  privateSourcesEnabled: boolean;
  advanceStep();
}

export const ConfigCompleted: React.FC<ConfigCompletedProps> = ({
  name,
  advanceStep,
  accountContextOnly,
  header,
  privateSourcesEnabled,
}) => (
  <div className="step-3">
    {header}
    <EuiSpacer size="xxl" />
    <EuiFlexGroup
      justifyContent="center"
      alignItems="stretch"
      direction="column"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <EuiTextAlign textAlign="center">
                <h1>{name} Configured</h1>
              </EuiTextAlign>
            </EuiText>
            <EuiText>
              <EuiTextAlign textAlign="center">
                {!accountContextOnly ? (
                  <p>{name} can now be connected to Workplace Search</p>
                ) : (
                  <EuiText color="subdued" grow={false}>
                    <p>Users can now link their {name} accounts from their personal dashboards.</p>
                    {!privateSourcesEnabled && (
                      <p>
                        Remember to{' '}
                        <Link to={SECURITY_PATH}>
                          <EuiLink>enable private source connection</EuiLink>
                        </Link>{' '}
                        in Security settings.
                      </p>
                    )}
                    <p>
                      <EuiLink target="_blank" href={PRIVATE_SOURCES_DOCS_URL}>
                        Learn more about private content sources.
                      </EuiLink>
                    </p>
                  </EuiText>
                )}
              </EuiTextAlign>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer />
    <EuiFlexGroup justifyContent="center" alignItems="center" direction="row" responsive={false}>
      <EuiFlexItem grow={false}>
        <Link to={getSourcesPath(ADD_SOURCE_PATH, true)}>
          <EuiButton fill={accountContextOnly} color={accountContextOnly ? 'primary' : undefined}>
            Configure&nbsp;a&nbsp;new&nbsp;content&nbsp;source
          </EuiButton>
        </Link>
      </EuiFlexItem>
      {!accountContextOnly && (
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" fill onClick={advanceStep}>
            Connect&nbsp;{name}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </div>
);
