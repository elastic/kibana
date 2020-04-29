/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LayerDescriptor } from '../../../../common/descriptor_types';

interface Props {
  previewLayer?: (layerDescriptor: LayerDescriptor | null) => void;
  mapColors: string[];
}

export function RUMLayerTemplate(props: Props) {
  return (
    <div>
      content goes here
    </div>
  );
}
