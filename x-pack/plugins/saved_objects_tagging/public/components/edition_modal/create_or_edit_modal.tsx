/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback, useMemo } from 'react';
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
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  TagAttributes,
  TagValidation,
  validateTagColor,
  tagNameMaxLength,
  tagDescriptionMaxLength,
} from '../../../common';
import { TagBadge } from '..';
import { getRandomColor, useIfMounted } from './utils';

interface CreateOrEditModalProps {
  onClose: () => void;
  onSubmit: () => Promise<void>;
  mode: 'create' | 'edit';
  tag: TagAttributes;
  validation: TagValidation;
  setField: <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => void;
}

export const CreateOrEditModal: FC<CreateOrEditModalProps> = ({
  onClose,
  onSubmit,
  validation,
  setField,
  tag,
  mode,
}) => {
  const optionalMessageId = htmlIdGenerator()();
  const ifMounted = useIfMounted();
  const [submitting, setSubmitting] = useState<boolean>(false);

  // we don't want this value to change when the user edit the name.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialName = useMemo(() => tag.name, []);

  const setName = useMemo(() => setField('name'), [setField]);
  const setColor = useMemo(() => setField('color'), [setField]);
  const setDescription = useMemo(() => setField('description'), [setField]);

  const isEdit = useMemo(() => mode === 'edit', [mode]);

  const previewTag: TagAttributes = useMemo(() => {
    return {
      ...tag,
      name: tag.name || 'tag',
      color: validateTagColor(tag.color) ? '#000000' : tag.color,
    };
  }, [tag]);

  const onFormSubmit = useCallback(async () => {
    setSubmitting(true);
    await onSubmit();
    // onSubmit can close the modal, causing errors in the console when the component tries to setState.
    ifMounted(() => {
      setSubmitting(false);
    });
  }, [ifMounted, onSubmit]);

  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]" style={{ minWidth: '600px' }}>
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
        <EuiForm data-test-subj="tagModalForm" component="form">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={3}>
              <EuiFormRow
                data-test-subj="createModalRow-name"
                fullWidth={true}
                label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.name', {
                  defaultMessage: 'Name',
                })}
                isInvalid={!!validation.errors.name}
                error={validation.errors.name}
              >
                <EuiFieldText
                  name="name"
                  fullWidth={true}
                  maxLength={tagNameMaxLength}
                  value={tag.name}
                  onChange={(e) => setName(e.target.value)}
                  data-test-subj="createModalField-name"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFormRow
                data-test-subj="createModalRow-color"
                fullWidth={true}
                label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.color', {
                  defaultMessage: 'Color',
                })}
                isInvalid={!!validation.errors.color}
                error={validation.errors.color}
                labelAppend={
                  <EuiButtonEmpty
                    onClick={() => setColor(getRandomColor())}
                    size="xs"
                    style={{ height: '18px', fontSize: '0.75rem' }}
                    aria-label={i18n.translate(
                      'xpack.savedObjectsTagging.management.createModal.color.randomizeAriaLabel',
                      {
                        defaultMessage: 'Randomize tag color',
                      }
                    )}
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
                  fullWidth={true}
                  onChange={(text) => setColor(text)}
                  format="hex"
                  data-test-subj="createModalField-color"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFormRow
            data-test-subj="createModalRow-description"
            fullWidth={true}
            label={i18n.translate('xpack.savedObjectsTagging.tagAttributeLabels.description', {
              defaultMessage: 'Description',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued" id={optionalMessageId}>
                <FormattedMessage
                  id="xpack.savedObjectsTagging.management.optionalFieldText"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
            isInvalid={!!validation.errors.description}
            error={validation.errors.description}
          >
            <EuiTextArea
              name="description"
              value={tag.description}
              maxLength={tagDescriptionMaxLength}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="createModalField-description"
              resize="none"
              fullWidth={true}
              compressed={true}
              aria-describedby={optionalMessageId}
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
                    defaultMessage="Preview"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TagBadge tag={previewTag} />
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
                  data-test-subj="createModalConfirmButton"
                  onClick={onFormSubmit}
                  isDisabled={submitting}
                >
                  {isEdit ? (
                    <FormattedMessage
                      id="xpack.savedObjectsTagging.management.createModal.updateTagButtonLabel"
                      defaultMessage="Save changes"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.savedObjectsTagging.management.createModal.createTagButtonLabel"
                      defaultMessage="Create tag"
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
