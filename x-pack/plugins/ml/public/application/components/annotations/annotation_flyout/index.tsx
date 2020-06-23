/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment, FC, ReactNode } from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';

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

import { CommonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ANNOTATION_MAX_LENGTH_CHARS } from '../../../../../common/constants/annotations';
import {
  annotation$,
  annotationsRefreshed,
  AnnotationState,
} from '../../../services/annotations_service';
import { AnnotationDescriptionList } from '../annotation_description_list';
import { DeleteAnnotationModal } from '../delete_annotation_modal';

import { ml } from '../../../services/ml_api_service';
import { getToastNotifications } from '../../../util/dependency_cache';

interface Props {
  annotation: AnnotationState;
}

interface State {
  isDeleteModalVisible: boolean;
}

class AnnotationFlyoutUI extends Component<CommonProps & Props> {
  public state: State = {
    isDeleteModalVisible: false,
  };

  public annotationSub: Rx.Subscription | null = null;

  public annotationTextChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (this.props.annotation === null) {
      return;
    }

    annotation$.next({
      ...this.props.annotation,
      annotation: e.target.value,
    });
  };

  public cancelEditingHandler = () => {
    annotation$.next(null);
  };

  public deleteConfirmHandler = () => {
    this.setState({ isDeleteModalVisible: true });
  };

  public deleteHandler = async () => {
    const { annotation } = this.props;
    const toastNotifications = getToastNotifications();

    if (annotation === null || annotation._id === undefined) {
      return;
    }

    try {
      await ml.annotations.deleteAnnotation(annotation._id);
      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.ml.timeSeriesExplorer.timeSeriesChart.deletedAnnotationNotificationMessage',
          {
            defaultMessage: 'Deleted annotation for job with ID {jobId}.',
            values: { jobId: annotation.job_id },
          }
        )
      );
    } catch (err) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.ml.timeSeriesExplorer.timeSeriesChart.errorWithDeletingAnnotationNotificationErrorMessage',
          {
            defaultMessage:
              'An error occurred deleting the annotation for job with ID {jobId}: {error}',
            values: { jobId: annotation.job_id, error: JSON.stringify(err) },
          }
        )
      );
    }

    this.closeDeleteModal();
    annotation$.next(null);
    annotationsRefreshed();
  };

  public closeDeleteModal = () => {
    this.setState({ isDeleteModalVisible: false });
  };

  public validateAnnotationText = () => {
    // Validates the entered text, returning an array of error messages
    // for display in the form. An empty array is returned if the text is valid.
    const { annotation } = this.props;
    const errors: string[] = [];
    if (annotation === null) {
      return errors;
    }

    if (annotation.annotation.trim().length === 0) {
      errors.push(
        i18n.translate('xpack.ml.timeSeriesExplorer.annotationFlyout.noAnnotationTextError', {
          defaultMessage: 'Enter annotation text',
        })
      );
    }

    const textLength = annotation.annotation.length;
    if (textLength > ANNOTATION_MAX_LENGTH_CHARS) {
      const charsOver = textLength - ANNOTATION_MAX_LENGTH_CHARS;
      errors.push(
        i18n.translate('xpack.ml.timeSeriesExplorer.annotationFlyout.maxLengthError', {
          defaultMessage:
            '{charsOver, number} {charsOver, plural, one {character} other {characters}} above maximum length of {maxChars}',
          values: {
            maxChars: ANNOTATION_MAX_LENGTH_CHARS,
            charsOver,
          },
        })
      );
    }

    return errors;
  };

  public saveOrUpdateAnnotation = () => {
    const { annotation } = this.props;

    if (annotation === null) {
      return;
    }

    annotation$.next(null);

    ml.annotations
      .indexAnnotation(annotation)
      .then(() => {
        annotationsRefreshed();
        const toastNotifications = getToastNotifications();
        if (typeof annotation._id === 'undefined') {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.ml.timeSeriesExplorer.timeSeriesChart.addedAnnotationNotificationMessage',
              {
                defaultMessage: 'Added an annotation for job with ID {jobId}.',
                values: { jobId: annotation.job_id },
              }
            )
          );
        } else {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.ml.timeSeriesExplorer.timeSeriesChart.updatedAnnotationNotificationMessage',
              {
                defaultMessage: 'Updated annotation for job with ID {jobId}.',
                values: { jobId: annotation.job_id },
              }
            )
          );
        }
      })
      .catch((resp) => {
        const toastNotifications = getToastNotifications();
        if (typeof annotation._id === 'undefined') {
          toastNotifications.addDanger(
            i18n.translate(
              'xpack.ml.timeSeriesExplorer.timeSeriesChart.errorWithCreatingAnnotationNotificationErrorMessage',
              {
                defaultMessage:
                  'An error occurred creating the annotation for job with ID {jobId}: {error}',
                values: { jobId: annotation.job_id, error: JSON.stringify(resp) },
              }
            )
          );
        } else {
          toastNotifications.addDanger(
            i18n.translate(
              'xpack.ml.timeSeriesExplorer.timeSeriesChart.errorWithUpdatingAnnotationNotificationErrorMessage',
              {
                defaultMessage:
                  'An error occurred updating the annotation for job with ID {jobId}: {error}',
                values: { jobId: annotation.job_id, error: JSON.stringify(resp) },
              }
            )
          );
        }
      });
  };

  public render(): ReactNode {
    const { annotation } = this.props;
    const { isDeleteModalVisible } = this.state;

    if (annotation === null) {
      return null;
    }

    const isExistingAnnotation = typeof annotation._id !== 'undefined';

    // Check the length of the text is within the max length limit,
    // and warn if the length is approaching the limit.
    const validationErrors = this.validateAnnotationText();
    const isInvalid = validationErrors.length > 0;
    const lengthRatioToShowWarning = 0.95;
    let helpText = null;
    if (
      isInvalid === false &&
      annotation.annotation.length > ANNOTATION_MAX_LENGTH_CHARS * lengthRatioToShowWarning
    ) {
      helpText = i18n.translate(
        'xpack.ml.timeSeriesExplorer.annotationFlyout.approachingMaxLengthWarning',
        {
          defaultMessage:
            '{charsRemaining, number} {charsRemaining, plural, one {character} other {characters}} remaining',
          values: { charsRemaining: ANNOTATION_MAX_LENGTH_CHARS - annotation.annotation.length },
        }
      );
    }

    return (
      <Fragment>
        <EuiFlyout onClose={this.cancelEditingHandler} size="s" aria-labelledby="Add annotation">
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
              helpText={helpText}
              isInvalid={isInvalid}
              error={validationErrors}
            >
              <EuiTextArea
                fullWidth
                isInvalid={isInvalid}
                onChange={this.annotationTextChangeHandler}
                placeholder="..."
                value={annotation.annotation}
              />
            </EuiFormRow>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={this.cancelEditingHandler} flush="left">
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.annotationFlyout.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isExistingAnnotation && (
                  <EuiButtonEmpty color="danger" onClick={this.deleteConfirmHandler}>
                    <FormattedMessage
                      id="xpack.ml.timeSeriesExplorer.annotationFlyout.deleteButtonLabel"
                      defaultMessage="Delete"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={isInvalid === true}
                  onClick={this.saveOrUpdateAnnotation}
                >
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
        <DeleteAnnotationModal
          cancelAction={this.closeDeleteModal}
          deleteAction={this.deleteHandler}
          isVisible={isDeleteModalVisible}
        />
      </Fragment>
    );
  }
}

export const AnnotationFlyout: FC<any> = (props) => {
  const annotationProp = useObservable(annotation$);

  if (annotationProp === undefined) {
    return null;
  }

  return <AnnotationFlyoutUI annotation={annotationProp} {...props} />;
};
