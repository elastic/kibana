/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WithHeaderLayout } from '../../components/app/layout/with_header';

const CentralizedFlexGroup = styled(EuiFlexGroup)`
  justify-content: center;
  align-items: center;
  // place the element in the center of the page
  min-height: calc(100vh - ${(props) => props.theme.eui.euiHeaderChildSize});
`;

export const LoadingObservability = () => {
  const theme = useContext(ThemeContext);

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
      showAddData
      showGiveFeedback
    >
      <CentralizedFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                <EuiText>
                  {i18n.translate('xpack.observability.overview.loadingObservability', {
                    defaultMessage: 'Loading Observability',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </CentralizedFlexGroup>
    </WithHeaderLayout>
  );
};
