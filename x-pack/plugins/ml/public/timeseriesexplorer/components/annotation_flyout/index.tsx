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

import { FormattedMessage } from '@kbn/i18n/react';

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
  return (
    <EuiFlyout onClose={cancelAction} size="s" aria-labelledby="Add annotation">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="mlAnnotationFlyoutTitle">
            {isExistingAnnotation ? (
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.annotationFlyout.editAnnotationTitle"
                defaultMessage="Edit annotation"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.annotationFlyout.addAnnotationTitle"
                defaultMessage="Add annotation"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AnnotationDescriptionList annotation={annotation} />
        <EuiSpacer size="m" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.timeSeriesExplorer.annotationFlyout.annotationTextLabel"
              defaultMessage="Annotation text"
            />
          }
          fullWidth
        >
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
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.annotationFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isExistingAnnotation && (
              <EuiButtonEmpty color="danger" onClick={deleteActionWrapper}>
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.annotationFlyout.deleteButtonLabel"
                  defaultMessage="Delete"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isDisabled={annotation.annotation === ''} onClick={saveActionWrapper}>
              {isExistingAnnotation ? (
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.annotationFlyout.updateButtonLabel"
                  defaultMessage="Update"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.annotationFlyout.createButtonLabel"
                  defaultMessage="Create"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
