/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface InterimResultsControlProps {
  value: boolean;
  onChange: (update: boolean) => void;
}

export const InterimResultsControl: FC<InterimResultsControlProps> = React.memo(
  ({ value, onChange }) => {
    return (
      <EuiFormRow>
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.ml.interimResultsControl.label"
              defaultMessage="Include interim results"
            />
          }
          checked={value ?? false}
          onChange={onChange.bind(null, !value)}
        />
      </EuiFormRow>
    );
  }
);
