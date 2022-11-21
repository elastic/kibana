/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ConnectorFilteringForm } from './connector_filtering_form';

export const EditFilteringTab: React.FC<{ revertAction: () => void }> = ({
  children,
  revertAction,
}) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-connector-filtering-editRules-revert"
              onClick={revertAction}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.connector.filtering.flyout.revertButtonTitle',
                {
                  defaultMessage: 'Revert to active rules',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <ConnectorFilteringForm>{children}</ConnectorFilteringForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
