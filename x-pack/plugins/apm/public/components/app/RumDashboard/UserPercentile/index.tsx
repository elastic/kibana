/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiSuperSelect, EuiHealth, EuiImage, EuiText } from '@elastic/eui';

export function UserPercentile() {
  const options = [
    {
      value: 'minor',
      inputDisplay: (
        <>
          <EuiImage
            size="l"
            hasShadow
            url="https://user-images.githubusercontent.com/3505601/94191254-86a55180-fead-11ea-98da-23e459a1fb50.png"
          />
          <EuiText>
            <h3>Median</h3>
          </EuiText>
        </>
      ),
      'data-test-subj': 'option-minor',
    },
    {
      value: 'warning',
      inputDisplay: (
        <>
          <EuiImage
            size="l"
            hasShadow
            url="https://user-images.githubusercontent.com/3505601/94191264-8907ab80-fead-11ea-95a7-e97be222714e.png"
          />
          <EuiText>
            <h3>P75</h3>
          </EuiText>
        </>
      ),
      'data-test-subj': 'option-warning',
      disabled: true,
    },
    {
      value: 'critical',
      inputDisplay: (
        <>
          <EuiImage
            size="l"
            hasShadow
            url="https://user-images.githubusercontent.com/3505601/94191248-84db8e00-fead-11ea-83a6-f59718015d06.png"
          />
          <EuiText>
            <h3>P90</h3>
          </EuiText>
        </>
      ),
      'data-test-subj': 'option-critical',
    },
    {
      value: 'critical',
      inputDisplay: (
        <>
          <EuiImage
            size="l"
            hasShadow
            url="https://user-images.githubusercontent.com/3505601/94191241-82793400-fead-11ea-821a-bfa7bab4e616.png"
          />
          <EuiText>
            <h3>P100</h3>
          </EuiText>
        </>
      ),
      'data-test-subj': 'option-critical',
    },
  ];
  const [value, setValue] = useState(options[1].value);

  const onChange = (value) => {
    setValue(value);
  };

  return (
    <EuiSuperSelect
      style={{ width: 300 }}
      options={options}
      valueOfSelected={value}
      onChange={(value) => onChange(value)}
    />
  );
}
