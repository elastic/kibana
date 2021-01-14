/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFormRow, EuiSelectable, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const PolicySelect = memo(() => {
  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.securitySolution.trustedapps.policySelect.globalSectionTitle',
          {
            defaultMessage: 'Global application',
          }
        )}
      >
        <EuiSwitch
          label={i18n.translate(
            'xpack.securitySolution.trustedapps.policySelect.globalSwitchTitle',
            {
              defaultMessage: 'Apply trusted application globally',
            }
          )}
          checked={true}
          onChange={(e) => {}}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.securitySolution.policySelect.policySpecificSectionTitle', {
          defaultMessage: 'Apply to specific endpoint policies',
        })}
      >
        <EuiSelectable
          options={[
            { label: 'policy 1' },
            { label: 'policy 2' },
            { label: 'policy 3' },
            { label: 'policy 4' },
          ]}
          listProps={{ bordered: true }} // << use imutable obj
          onChange={(newOptions) => {}}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiFormRow>
    </>
  );
});

PolicySelect.displayName = 'PolicySelect';
