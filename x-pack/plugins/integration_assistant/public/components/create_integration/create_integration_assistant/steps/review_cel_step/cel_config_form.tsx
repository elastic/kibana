/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiFormRow, EuiTextArea } from '@elastic/eui';
import type { CelInput } from '../../../../../../common';

interface CelConfigFormProps {
  celInputResult?: CelInput;
}

export const CelConfigForm = React.memo<CelConfigFormProps>(({ celInputResult }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true}>
        <EuiFormRow label="CEL program" hasChildLabel={false} isDisabled>
          <EuiTextArea
            aria-label="Use aria labels when no actual label is in use"
            value={celInputResult?.program}
            // onChange={(e) => onChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Initial CEL evaluation state" hasChildLabel={false} isDisabled>
          <EuiTextArea
            aria-label="Use aria labels when no actual label is in use"
            value={JSON.stringify(celInputResult?.stateSettings)}
            // onChange={(e) => onChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Settings" hasChildLabel={false} isDisabled>
          <EuiTextArea
            aria-label="Use aria labels when no actual label is in use"
            value={celInputResult?.redactVars}
            // onChange={(e) => onChange(e)}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CelConfigForm.displayName = 'CelConfigForm';
