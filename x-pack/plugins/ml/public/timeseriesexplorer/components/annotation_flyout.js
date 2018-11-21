/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import { AnnotationDescriptionList } from './annotation_description_list';

export function AnnotationFlyout({ closeFlyout, annotation }) {
  return (
    <EuiFlyout onClose={closeFlyout} size="s" aria-labelledby="Add annotation">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="mlAnnotationFlyoutTitle">Add annotation</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AnnotationDescriptionList annotation={annotation} />
        <EuiSpacer size="m" />
        <EuiFormRow label="Annotation text" fullWidth>
          <EuiTextArea fullWidth placeholder="..." />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeFlyout} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
