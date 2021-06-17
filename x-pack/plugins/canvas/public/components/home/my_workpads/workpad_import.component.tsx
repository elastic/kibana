/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilePicker, EuiFilePickerProps } from '@elastic/eui';

import { ComponentStrings } from '../../../../i18n';

const { WorkpadImport: strings } = ComponentStrings;

export interface Props {
  canUserWrite: boolean;
  onImportWorkpad?: EuiFilePickerProps['onChange'];
  uniqueKey?: string | number;
}

export const WorkpadImport = ({ uniqueKey, canUserWrite, onImportWorkpad = () => {} }: Props) => (
  <EuiFilePicker
    display="default"
    className="canvasWorkpad__upload--compressed"
    aria-label={strings.getFilePickerPlaceholder()}
    initialPromptText={strings.getFilePickerPlaceholder()}
    onChange={onImportWorkpad}
    key={uniqueKey}
    accept="application/json"
    disabled={!canUserWrite}
  />
);
