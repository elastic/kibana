/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactElement } from 'react';
import { StyleDescriptor } from '../../../common/descriptor_types';

export interface IStyle {
  getType(): string;
  renderEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void
  ): ReactElement<any> | null;
}
