/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiFieldText } from '@elastic/eui';

interface AlertPopoverConfigureNumberParamProps {
  name: string;
  number: number;
  setBody: (body: any) => void;
}
export const AlertPopoverConfigureNumberParam: React.FC<AlertPopoverConfigureNumberParamProps> = (
  props: AlertPopoverConfigureNumberParamProps
) => {
  const { name, setBody } = props;
  const [value, setValue] = React.useState(props.number);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiFieldText
          compressed
          value={value}
          onChange={(e) => {
            setValue(parseInt(e.target.value, 10));
            setBody({ [name]: value });
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
