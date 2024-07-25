/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';

interface Props {
  username: string;
}

export const EntityResolutionTab = ({ username }: Props) => {
  const entities = [
    { 'user.name': 'test', confidence: 0.9, resolved: false },
    { 'user.name': 'test2', confidence: 0.8, resolved: true },
  ];

  return (
    <>
      <EuiTitle>
        <h2>{'Observed Data'}</h2>
      </EuiTitle>
      {entities.map((entity, index) => {
        return (
          <EuiPanel hasBorder>
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem>{entity['user.name']}</EuiFlexItem>
              <EuiFlexItem>{entity.confidence}</EuiFlexItem>
              {!entity.resolved && (
                <EuiButton size="s" fill>
                  {'Mark as resolved'}
                </EuiButton>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        );
      })}
    </>
  );
};
