/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { useEntityResolutions } from '../../../../api/hooks/use_entity_resolutions';

interface Props {
  username: string;
}

export const EntityResolutionTab = ({ username }: Props) => {
  const { resolutions, markResolved } = useEntityResolutions({ name: username, type: 'user' });

  return (
    <>
      <EuiTitle>
        <h2>{'Observed Data'}</h2>
      </EuiTitle>
      {resolutions.isLoading && <EuiLoadingSpinner size="xl" />}
      {resolutions.data?.candidates?.map(({ entity, confidence, document, id, reason }) => {
        if (!entity || !document || !id) return null;
        return (
          <EuiPanel hasBorder>
            <EuiFlexGroup justifyContent="spaceEvenly" direction="column">
              <EuiFlexGroup justifyContent="flexStart">
                <EuiFlexItem>{entity.name}</EuiFlexItem>

                <EuiFlexItem>{confidence}</EuiFlexItem>
                <EuiFlexItem>{reason}</EuiFlexItem>

                <EuiButtonEmpty
                  size="m"
                  onClick={() =>
                    markResolved({ id, type: 'user', name: entity.name }, 'is_different')
                  }
                >
                  {'Mark as different'}
                </EuiButtonEmpty>
                <EuiButton
                  size="m"
                  onClick={() => markResolved({ id, type: 'user', name: entity.name }, 'is_same')}
                >
                  {'Confirm as Same'}
                </EuiButton>
              </EuiFlexGroup>
              <EuiText>{reason}</EuiText>
              <EuiCodeBlock language="json">{JSON.stringify(document)}</EuiCodeBlock>
            </EuiFlexGroup>
          </EuiPanel>
        );
      })}
    </>
  );
};
