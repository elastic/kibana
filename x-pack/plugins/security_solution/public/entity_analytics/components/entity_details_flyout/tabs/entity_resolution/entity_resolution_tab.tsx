/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
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
  const entities = useEntityResolutions({ name: username, type: 'user' });

  return (
    <>
      <EuiTitle>
        <h2>{'Observed Data'}</h2>
      </EuiTitle>
      {entities.isLoading && <EuiLoadingSpinner size="xl" />}
      {entities.data?.suggestions?.map(({ entity, confidence, document, id, reason }) => {
        return (
          <EuiPanel hasBorder>
            <EuiFlexGroup justifyContent="spaceEvenly" direction="column">
              <EuiFlexGroup justifyContent="flexStart">
                <EuiFlexItem>{entity?.name}</EuiFlexItem>

                <EuiFlexItem>{confidence}</EuiFlexItem>
                <EuiFlexItem>{reason}</EuiFlexItem>
                {/* {!entity.resolved && (
                <EuiButton size="s" fill>
                {'Mark as resolved'}
                </EuiButton>
                )} */}
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
