/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCallOut,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/hooks/use_kibana';

export const ErrorCallout = ({ error }: { error: Error }) => {
  const {
    data: { search },
  } = useKibana().services;

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiPanel paddingSize="l" grow>
          <EuiCallOut
            title={i18n.translate('xpack.csp.findings.errorCallout.pageSearchErrorTitle', {
              defaultMessage: 'We encountered an error retrieving search results',
            })}
            color="danger"
            iconType="alert"
          >
            <EuiSpacer />
            <EuiButton size="s" color="danger" onClick={() => search.showError(error)}>
              <FormattedMessage
                id="xpack.csp.findings.errorCallout.showErrorButtonLabel"
                defaultMessage="Show error message"
              />
            </EuiButton>
          </EuiCallOut>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
