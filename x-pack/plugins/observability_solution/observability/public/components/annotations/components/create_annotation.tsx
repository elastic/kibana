/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { Moment } from 'moment';
import { useDeleteAnnotation } from '../use_delete_annotation';
import { useUpdateAnnotation } from '../hooks/use_update_annotation';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
import { useCreateAnnotation } from '../use_create_annotation';
import { AnnotationForm } from '../annotation_form';

export type CreateAnnotationForm = Omit<CreateAnnotationParams, '@timestamp' | '@timestampEnd'> & {
  '@timestamp': Moment | null;
  '@timestampEnd': Moment | null;
};

export interface CreateAnnotationProps {
  onCancel: () => void;
  onSave: () => void;
  isCreateAnnotationsOpen: boolean;
  editAnnotation?: Annotation | null;
}

export function CreateAnnotation({
  onSave,
  onCancel,
  isCreateAnnotationsOpen,
  editAnnotation,
}: CreateAnnotationProps) {
  const { trigger, getValues } = useFormContext<CreateAnnotationForm>();
  const { mutateAsync: createAnnotation, isLoading: isSaving } = useCreateAnnotation();
  const { mutateAsync: updateAnnotation, isLoading: isUpdating } = useUpdateAnnotation();
  const { mutateAsync: deleteAnnotation, isLoading: isDeleting } = useDeleteAnnotation();

  const isLoading = isSaving || isUpdating || isDeleting;

  const onSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) return;
    const values = getValues();
    if (editAnnotation?.id) {
      await updateAnnotation({
        annotation: {
          ...values,
          id: editAnnotation.id,
          '@timestamp': values['@timestamp']?.toISOString()!,
          '@timestampEnd': values['@timestampEnd']?.toISOString(),
        },
      });
      onSave();
    } else {
      await createAnnotation({
        annotation: {
          ...values,
          '@timestamp': values['@timestamp']?.toISOString()!,
          '@timestampEnd': values['@timestampEnd']?.toISOString(),
        },
      });
      onSave();
    }
  };

  const onDelete = async () => {
    if (editAnnotation?.id) {
      await deleteAnnotation({ annotations: [editAnnotation] });
      onSave();
    }
  };

  let flyout;
  if (isCreateAnnotationsOpen) {
    flyout = (
      <EuiFlyoutResizable onClose={onCancel} type="push" size="s" maxWidth={700}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2>
              {editAnnotation
                ? i18n.translate(
                    'xpack.observability.createAnnotation.editAnnotationModalHeaderTitleLabel',
                    {
                      defaultMessage: 'Update annotation',
                    }
                  )
                : i18n.translate(
                    'xpack.observability.createAnnotation.addAnnotationModalHeaderTitleLabel',
                    { defaultMessage: 'Create annotation' }
                  )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AnnotationForm editAnnotation={editAnnotation} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilitySolutionCancelButton"
                onClick={onCancel}
                isLoading={isLoading}
              >
                {i18n.translate('xpack.observability.createAnnotation.closeButtonEmptyLabel', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem />
            {editAnnotation?.id && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilitySolutionDeleteButton"
                  type="submit"
                  onClick={() => onDelete()}
                  isLoading={isLoading}
                  color="danger"
                >
                  {i18n.translate('xpack.observability.createAnnotation.deleteButtonLabel', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilitySolutionSaveButton"
                type="submit"
                onClick={() => onSubmit()}
                isLoading={isLoading}
                fill
              >
                {editAnnotation?.id
                  ? i18n.translate('xpack.observability.createAnnotation.updateButtonLabel', {
                      defaultMessage: 'Update',
                    })
                  : i18n.translate('xpack.observability.createAnnotation.saveButtonLabel', {
                      defaultMessage: 'Save',
                    })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
  return <>{flyout}</>;
}

// eslint-disable-next-line import/no-default-export
export default CreateAnnotation;
