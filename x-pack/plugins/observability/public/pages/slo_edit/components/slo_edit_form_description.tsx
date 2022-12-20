/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { ChangeEvent, useState } from 'react';

export function SloEditFormDescription() {
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });

  const [sloName, setSloName] = useState('');
  const [sloDescription, setSloDescription] = useState('');

  const handleChangeSloName = (e: ChangeEvent<HTMLInputElement>) => {
    setSloName(e.target.value);
  };

  const handleChangeSloDescription = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSloDescription(e.target.value);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFormLabel>SLO Name</EuiFormLabel>
        <EuiFieldText fullWidth id={sloNameId} value={sloName} onChange={handleChangeSloName} />
      </EuiFlexItem>

      <EuiFlexItem grow>
        <EuiFormLabel>Description</EuiFormLabel>
        <EuiTextArea
          fullWidth
          id={descriptionId}
          placeholder="The purpose of SLO, internal or external."
          value={sloDescription}
          onChange={handleChangeSloDescription}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
