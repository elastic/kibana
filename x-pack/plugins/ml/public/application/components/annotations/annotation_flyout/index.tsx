/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, FC, ReactNode, useCallback, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';
import { cloneDeep } from 'lodash';

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
  EuiCheckbox,
} from '@elastic/eui';

import { CommonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ANNOTATION_MAX_LENGTH_CHARS,
  ANNOTATION_EVENT_USER,
} from '../../../../../common/constants/annotations';
import {
  annotationsRefreshed,
  AnnotationState,
  AnnotationUpdatesService,
} from '../../../services/annotations_service';
import { AnnotationDescriptionList } from '../annotation_description_list';
import { DeleteAnnotationModal } from '../delete_annotation_modal';
import { ml } from '../../../services/ml_api_service';
import { getToastNotifications } from '../../../util/dependency_cache';
import {
  getAnnotationFieldName,
  getAnnotationFieldValue,
} from '../../../../../common/types/annotations';
import { PartitionFieldsType } from '../../../../../common/types/anomalies';
import { PARTITION_FIELDS } from '../../../../../common/constants/anomalies';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';

interface ViewableDetector {
  index: number;
  detector_description: string;
}

interface Entity {
  fieldName: string;
  fieldType: string;
  fieldValue: string;
}

interface Props {
  chartDetails: {
    entityData: { entities: Entity[] };
    functionLabel: string;
  };
  detectorIndex: number;
  detectors: ViewableDetector[];
  annotationUpdatesService: AnnotationUpdatesService;
}

interface State {
  annotationState: AnnotationState | null;
  isDeleteModalVisible: boolean;
  applyAnnotationToSeries: boolean;
}

export class AnnotationFlyoutUI extends Component<CommonProps & Props> {
  public state: State = {
    isDeleteModalVisible: false,
    applyAnnotationToSeries: true,
    annotationState: null,
  };

  public annotationSub: Rx.Subscription | null = null;

  componentDidMount() {
    const { annotationUpdatesService } = this.props;
    this.annotationSub = annotationUpdatesService.update$().subscribe((v) => {
      this.setState({
        annotationState: v,
      });
    });
  }

  componentWillUnmount() {
    this.annotationSub!.unsubscribe();
  }

  public annotationTextChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (this.state.annotationState === null) {
      return;
    }
    const { annotationUpdatesService } = this.props;

    annotationUpdatesService.setValue({
      ...this.state.annotationState,
      annotation: e.target.value,
    });
  };

  public cancelEditingHandler = () => {
    const { annotationUpdatesService } = this.props;
    annotationUpdatesService.setValue(null);
  };

  public deleteConfirmHandler = () => {
    this.setState({ isDeleteModalVisible: true });
  };

  public deleteHandler = async () => {
    const { annotationState } = this.state;
    const toastNotifications = getToastNotifications();

    if (annotationState === null || annotationState._id === undefined) {
      return;
    }

    try {
      await ml.annotations.deleteAnnotation(annotationState._id);
      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.ml.timeSeriesExplorer.timeSeriesChart.deletedAnnotationNotificationMessage',
          {
            defaultMessage: 'Deleted annotation for job with ID {jobId}.',
            values: { jobId: annotationState.job_id },
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
            values: { jobId: annotationState.job_id, error: JSON.stringify(err) },
          }
        )
      );
    }

    this.closeDeleteModal();

    const { annotationUpdatesService } = this.props;

    annotationUpdatesService.setValue(null);
    annotationsRefreshed();
  };

  public closeDeleteModal = () => {
    this.setState({ isDeleteModalVisible: false });
  };

  public validateAnnotationText = () => {
    // Validates the entered text, returning an array of error messages
    // for display in the form. An empty array is returned if the text is valid.
    const { annotationState } = this.state;
    const errors: string[] = [];
    if (annotationState === null) {
      return errors;
    }

    if (annotationState.annotation.trim().length === 0) {
      errors.push(
        i18n.translate('xpack.ml.timeSeriesExplorer.annotationFlyout.noAnnotationTextError', {
          defaultMessage: 'Enter annotation text',
        })
      );
    }

    const textLength = annotationState.annotation.length;
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
    const { annotationState: originalAnnotation } = this.state;
    const { chartDetails, detectorIndex, annotationUpdatesService } = this.props;

    if (originalAnnotation === null) {
      return;
    }
    const annotation = cloneDeep(originalAnnotation);

    if (this.state.applyAnnotationToSeries && chartDetails?.entityData?.entities) {
      chartDetails.entityData.entities.forEach((entity: Entity) => {
        const { fieldName, fieldValue } = entity;
        const fieldType = entity.fieldType as PartitionFieldsType;
        annotation[getAnnotationFieldName(fieldType)] = fieldName;
        annotation[getAnnotationFieldValue(fieldType)] = fieldValue;
      });
      annotation.detector_index = detectorIndex;
    }
    // if unchecked, remove all the partitions before indexing
    if (!this.state.applyAnnotationToSeries) {
      delete annotation.detector_index;
      PARTITION_FIELDS.forEach((fieldType) => {
        delete annotation[getAnnotationFieldName(fieldType)];
        delete annotation[getAnnotationFieldValue(fieldType)];
      });
    }
    // Mark the annotation created by `user` if and only if annotation is being created, not updated
    annotation.event = annotation.event ?? ANNOTATION_EVENT_USER;
    annotationUpdatesService.setValue(null);

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
    const { detectors, detectorIndex } = this.props;
    const { annotationState, isDeleteModalVisible } = this.state;

    if (!annotationState) return null;

    const isExistingAnnotation = typeof annotationState._id !== 'undefined';

    // Check the length of the text is within the max length limit,
    // and warn if the length is approaching the limit.
    const validationErrors = this.validateAnnotationText();
    const isInvalid = validationErrors.length > 0;
    const lengthRatioToShowWarning = 0.95;
    let helpText = null;
    if (
      isInvalid === false &&
      annotationState.annotation.length > ANNOTATION_MAX_LENGTH_CHARS * lengthRatioToShowWarning
    ) {
      helpText = i18n.translate(
        'xpack.ml.timeSeriesExplorer.annotationFlyout.approachingMaxLengthWarning',
        {
          defaultMessage:
            '{charsRemaining, number} {charsRemaining, plural, one {character} other {characters}} remaining',
          values: {
            charsRemaining: ANNOTATION_MAX_LENGTH_CHARS - annotationState.annotation.length,
          },
        }
      );
    }
    const detector = detectors ? detectors.find((d) => d.index === detectorIndex) : undefined;
    const detectorDescription =
      detector && 'detector_description' in detector ? detector.detector_description : '';

    return (
      <>
        <EuiFlyoutBody>
          <AnnotationDescriptionList
            annotation={annotationState}
            detectorDescription={detectorDescription}
          />
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
              value={annotationState.annotation}
              data-test-subj={'mlAnnotationsFlyoutTextInput'}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiCheckbox
              id={'xpack.ml.annotationFlyout.applyToPartition'}
              label={
                <FormattedMessage
                  id="xpack.ml.annotationFlyout.applyToPartitionTextLabel"
                  defaultMessage="Apply annotation to this series"
                />
              }
              checked={this.state.applyAnnotationToSeries}
              onChange={() =>
                this.setState({
                  applyAnnotationToSeries: !this.state.applyAnnotationToSeries,
                })
              }
              data-test-subj={'mlAnnotationsFlyoutApplyToSeriesButton'}
            />
          </EuiFormRow>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={this.cancelEditingHandler}
                flush="left"
                data-test-subj={'mlAnnotationsFlyoutCancelButton'}
              >
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.annotationFlyout.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
              {isExistingAnnotation && (
                <EuiButtonEmpty
                  color="danger"
                  onClick={this.deleteConfirmHandler}
                  data-test-subj={'mlAnnotationsFlyoutDeleteButton'}
                >
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
                data-test-subj={'annotationFlyoutUpdateOrCreateButton'}
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
        <DeleteAnnotationModal
          cancelAction={this.closeDeleteModal}
          deleteAction={this.deleteHandler}
          isVisible={isDeleteModalVisible}
        />
      </>
    );
  }
}

export const AnnotationFlyout: FC<any> = (props) => {
  const annotationUpdatesService = useContext(MlAnnotationUpdatesContext);
  const annotationProp = useObservable(annotationUpdatesService.isAnnotationInitialized$());

  const cancelEditingHandler = useCallback(() => {
    annotationUpdatesService.setValue(null);
  }, []);

  if (annotationProp === undefined || annotationProp === null) {
    return null;
  }

  const isExistingAnnotation = typeof annotationProp._id !== 'undefined';

  return (
    <EuiFlyout
      onClose={cancelEditingHandler}
      size="m"
      aria-labelledby="Add annotation"
      data-test-subj={'mlAnnotationFlyout'}
      className={'mlAnnotationFlyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj={'mlAnnotationFlyoutTitle'}>
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
      <AnnotationFlyoutUI {...props} annotationUpdatesService={annotationUpdatesService} />
    </EuiFlyout>
  );
};
