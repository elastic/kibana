/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiColorPicker,
  EuiTextArea,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TagAttributes } from '../../../common';
import { TagBadge } from '../../components';
import { getRandomColor, TagValidation } from './utils';

interface CreateOrEditModalProps {
  onClose: () => void;
  onSubmit: () => Promise<TagValidation>;
  mode: 'create' | 'edit';
  tag: TagAttributes;
  validate: (tag: TagAttributes) => TagValidation;
  setField: <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => void;
}

export const CreateOrEditModal: FC<CreateOrEditModalProps> = ({
  onClose,
  onSubmit,
  validate,
  setField,
  tag,
  mode,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validation, setValidation] = useState<TagValidation>({ valid: false });

  // we don't want this value to change when the user edit the name.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialName = useMemo(() => tag.title, []);

  const setTitle = useMemo(() => setField('title'), [setField]);
  const setColor = useMemo(() => setField('color'), [setField]);
  const setDescription = useMemo(() => setField('description'), [setField]);

  const isEdit = useMemo(() => mode === 'edit', [mode]);

  useEffect(() => {
    setValidation(validate(tag));
  }, [tag, validate]);

  const onFormSubmit = useCallback(async () => {
    if (!validation.valid) {
      return;
    }

    setSubmitting(true);
    const asyncValid = await onSubmit();
    setValidation(asyncValid);
    setSubmitting(false);
  }, [validation, onSubmit]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEdit ? (
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.editModal.title"
              defaultMessage="Edit '{name}' tag"
              values={{
                name: initialName,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.createModal.title"
              defaultMessage="Create tag"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm data-test-subj="savedObjectEditForm" role="form">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem>
              <EuiFormRow
                fullWidth={true}
                label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.name', {
                  defaultMessage: 'Name',
                })}
              >
                <EuiFieldText
                  value={tag.title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-test-subj="createModalField-name"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth={true}
                label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.color', {
                  defaultMessage: 'Color',
                })}
                labelAppend={
                  <EuiButtonEmpty
                    onClick={() => setColor(getRandomColor())}
                    size="xs"
                    style={{ height: '18px', fontSize: '0.75rem' }}
                  >
                    <FormattedMessage
                      id="xpack.savedObjectsTagging.management.createModal.color.randomize"
                      defaultMessage="Randomize"
                    />
                  </EuiButtonEmpty>
                }
              >
                <EuiColorPicker
                  color={tag.color}
                  onChange={(text, output) => setColor(output.hex)}
                  format="hex"
                  data-test-subj="createModalField-color"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth={true}
            label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.description', {
              defaultMessage: 'Description',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.savedObjectsTagging.management.optionalFieldText"
                  defaultMessage={'Optional'}
                />
              </EuiText>
            }
          >
            <EuiTextArea
              value={tag.description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="createModalField-description"
              resize="none"
              fullWidth={true}
              compressed={true}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="baseline">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.savedObjectsTagging.management.tagPreviewText"
                    defaultMessage={'Preview'}
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TagBadge tag={{ ...tag, title: tag.title || 'tag' }} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} data-test-subj="createModalCancelButton">
                  <FormattedMessage
                    id="xpack.savedObjectsTagging.management.createModal.closeButtonText"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType={isEdit ? 'save' : 'tag'}
                  color="primary"
                  fill
                  data-test-subj={isEdit ? 'editModalConfirmButton' : 'createModalConfirmButton'}
                  onClick={onFormSubmit}
                  isDisabled={!validation.valid && !submitting}
                >
                  {isEdit ? (
                    <FormattedMessage
                      id="xpack.savedObjectsTagging.management.createModal.updateTagButtonLabel"
                      defaultMessage="Save changes"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.savedObjectsTagging.management.createModal.createTagButtonLabel"
                      defaultMessage="Create tag..."
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
