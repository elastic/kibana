/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ConnectorSyncRulesForm } from './connector_sync_form';

export const EditSyncRulesTab: FC<
  PropsWithChildren<{
    revertAction: () => void;
  }>
> = ({ children, revertAction }) => {
  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="enterpriseSearchEditSyncRulesTabRevertToActiveRulesButton"
                data-telemetry-id="entSearchContent-connector-syncRules-editRules-revert"
                onClick={revertAction}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.connector.syncRules.flyout.revertButtonTitle',
                  {
                    defaultMessage: 'Revert to active rules',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConnectorSyncRulesForm>{children}</ConnectorSyncRulesForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
