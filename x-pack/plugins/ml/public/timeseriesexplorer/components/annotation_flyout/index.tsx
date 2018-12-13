/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

import { AnnotationDescriptionList } from '../annotation_description_list';

import { Annotation } from '../../../../common/types/annotations';

interface Props {
  annotation: Annotation;
  cancelAction: () => {};
  controlFunc: () => {};
  deleteAction: (annotation: Annotation) => {};
  saveAction: (annotation: Annotation) => {};
}

export const AnnotationFlyout: React.SFC<Props> = ({
  annotation,
  cancelAction,
  controlFunc,
  deleteAction,
  saveAction,
}) => {
  const saveActionWrapper = () => saveAction(annotation);
  const deleteActionWrapper = () => deleteAction(annotation);
  const isExistingAnnotation = typeof annotation._id !== 'undefined';
  const titlePrefix = isExistingAnnotation ? 'Edit' : 'Add';

  return (
    <EuiFlyout onClose={cancelAction} size="s" aria-labelledby="Add annotation">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="mlAnnotationFlyoutTitle">{titlePrefix} annotation</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AnnotationDescriptionList annotation={annotation} />
        <EuiSpacer size="m" />
        <EuiFormRow label="Annotation text" fullWidth>
          <EuiTextArea
            fullWidth
            isInvalid={annotation.annotation === ''}
            onChange={controlFunc}
            placeholder="..."
            value={annotation.annotation}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={cancelAction} flush="left">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isExistingAnnotation && (
              <EuiButtonEmpty color="danger" onClick={deleteActionWrapper}>
                Delete
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isDisabled={annotation.annotation === ''} onClick={saveActionWrapper}>
              {isExistingAnnotation ? 'Update' : 'Create'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
