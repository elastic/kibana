/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiText,
  EuiFlexGrid,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  onCancel?: () => void;
}

export const LoadingCategorization: FC<Props> = ({ onCancel }) => (
  <>
    <EuiSpacer size="l" />
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false} css={{ textAlign: 'center' }}>
        <EuiFlexGrid columns={1}>
          <EuiFlexItem>
            <EuiLoadingElastic size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.aiops.categorizeFlyout.loading.title"
                  defaultMessage="Loading pattern analysis"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceAround">
              <EuiFlexItem grow={false} css={{ textAlign: 'center' }}>
                <EuiButton
                  data-test-subj="aiopsLoadingCategorizationCancelButton"
                  onClick={onCancel}
                  disabled={!onCancel}
                >
                  Cancel
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
