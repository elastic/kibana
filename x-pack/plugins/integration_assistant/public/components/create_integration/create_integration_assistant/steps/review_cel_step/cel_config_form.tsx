/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiFormRow, EuiCodeBlock } from '@elastic/eui';
import { type State } from '../../state';
import * as i18n from './translations';

interface CelConfigFormProps {
  celInputResult: State['celInputResult'];
}

export const CelConfigForm = React.memo<CelConfigFormProps>(({ celInputResult }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true}>
        <EuiFormRow title={i18n.PROGRAM} hasChildLabel={false} fullWidth>
          <EuiCodeBlock language="c" fontSize="m" isCopyable>
            {celInputResult?.program}
          </EuiCodeBlock>
        </EuiFormRow>
        <EuiFormRow title={i18n.STATE} hasChildLabel={false} fullWidth>
          <EuiCodeBlock language="json" fontSize="m" isCopyable>
            {JSON.stringify(celInputResult?.stateSettings)}
          </EuiCodeBlock>
        </EuiFormRow>
        <EuiFormRow title={i18n.REDACT_VARS} hasChildLabel={false} fullWidth>
          <EuiCodeBlock language="json" fontSize="m" isCopyable>
            {JSON.stringify(celInputResult?.redactVars)}
          </EuiCodeBlock>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CelConfigForm.displayName = 'CelConfigForm';
