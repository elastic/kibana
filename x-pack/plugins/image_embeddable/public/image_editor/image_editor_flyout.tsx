/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFieldText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { ImageConfig } from '../types';

export interface ImageEditorFlyoutProps {
  onCancel: () => void;
  onSave: (imageConfigWithReferences: ImageConfig) => void;
  initialImageConfig?: ImageConfig;
}

export function ImageEditorFlyout(props: ImageEditorFlyoutProps) {
  const [src, setSrc] = useState(props.initialImageConfig?.src ?? '');

  const onSave = () => {
    props.onSave({
      ...props.initialImageConfig,
      src,
    });
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>Flyout header</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFieldText
          placeholder="Image src"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          aria-label="Image src"
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={props.onCancel} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
