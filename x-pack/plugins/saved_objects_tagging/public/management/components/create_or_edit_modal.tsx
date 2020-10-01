/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
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
import { FormattedMessage } from '@kbn/i18n/react';
import { TagAttributes, Tag, ITagsClient } from '../../../common/types';
import { TagBadge } from '../../components';
import { getRandomColor } from '../utils';

interface CreateOrEditModalProps {
  onClose: () => void;
  onCreate: (tag: Tag) => void;
  tagClient: ITagsClient;
}

const formDefaults = (): TagAttributes => ({
  title: '',
  description: '',
  color: getRandomColor(),
});

interface TagValidation {
  valid: boolean;
}

export const CreateOrEditModal: FC<CreateOrEditModalProps> = ({ onClose, onCreate, tagClient }) => {
  // TODO: edition mode

  const [tag, setTag] = useState<TagAttributes>(formDefaults());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validation, setValidation] = useState<TagValidation>({ valid: false });

  const setField = <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => {
    setTag({
      ...tag,
      [field]: value,
    });
  };
  const setTitle = setField('title');
  const setColor = setField('color');
  const setDescription = setField('description');

  // TODO: probably move validation to HOC
  const validateTag = useCallback(() => {
    let valid = true;

    if (!tag.title.trim()) {
      valid = false;
    }
    if (!tag.color) {
      valid = false;
    }
    setValidation({ valid });
  }, [tag]);

  useEffect(() => {
    validateTag();
  }, [validateTag]);

  const onSubmit = useCallback(async () => {
    if (!validation.valid) {
      return;
    }

    setSubmitting(true);

    try {
      const createdTag = await tagClient.create(tag);
      onCreate(createdTag);
    } catch (e) {
      // TODO: display error from server.
      setSubmitting(false);
    }
  }, [tag, validation, onCreate, tagClient]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.savedObjectsTagging.management.createModal.title"
            defaultMessage="Create tag"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm data-test-subj="savedObjectEditForm" role="form">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem>
              <EuiFormRow fullWidth={true} label={'Name'}>
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
                label={'Color'}
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
            label={'Description'}
            labelAppend={
              <EuiText size="xs" color="subdued">
                Optional
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
                  Preview
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
                  key="createTag"
                  iconType="tag"
                  color="primary"
                  fill
                  data-test-subj="createModalConfirmButton"
                  onClick={onSubmit}
                  isDisabled={!validation.valid && !submitting}
                >
                  <FormattedMessage
                    id="xpack.savedObjectsTagging.management.actions.createTag"
                    defaultMessage="Create tag..."
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
