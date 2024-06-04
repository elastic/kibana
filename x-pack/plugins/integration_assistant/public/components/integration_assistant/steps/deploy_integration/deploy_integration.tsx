/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-expect-error untyped local
import { saveAs } from '@elastic/filesaver';
import type { State } from '../../state';
import { useDeployIntegration } from './use_deploy_integration';

interface DeployIntegrationProps {
  integrationSettings: State['integrationSettings'];
  result: State['result'];
  connectorId: State['connectorId'];
}

export const DeployIntegration = React.memo<DeployIntegrationProps>(
  ({ integrationSettings, result, connectorId }) => {
    const { isLoading, error, integrationFile } = useDeployIntegration({
      integrationSettings,
      result,
      connectorId,
    });

    const onSaveZip = useCallback(() => {
      saveAs(integrationFile, `${integrationSettings?.name ?? 'integration'}.zip`);
    }, [integrationFile, integrationSettings]);

    return (
      <EuiFlexGroup gutterSize="m" direction="row">
        <EuiFlexItem grow={false}>
          {(isLoading || error) && (
            <>
              {'Deploying integration...'}
              {isLoading && <EuiLoadingSpinner size="l" />}
              <EuiSpacer size="m" />
              {error && <>{error}</>}
            </>
          )}
          {integrationFile && (
            <EuiButton fill onClick={onSaveZip}>
              <FormattedMessage
                id="xpack.integrationAssistant.downloadZip"
                defaultMessage="Download zip"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
DeployIntegration.displayName = 'DeployIntegration';
