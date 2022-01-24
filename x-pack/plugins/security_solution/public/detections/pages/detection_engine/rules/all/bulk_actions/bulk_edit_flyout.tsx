/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
} from '@elastic/eui';

import { Form, useForm } from '../../../../../../shared_imports';

import * as i18n from '../../translations';

import {
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  indexPatternsFormConfiguration,
  indexPatternsFormDataToEditActionPayload,
} from './forms/index_patterns_form';
import { tagsFormConfiguration, tagsFormDataToEditActionPayload } from './forms/tags_form';

const isIndexPatternsForm = (editAction: BulkActionEditType) =>
  [
    BulkActionEditType.add_index_patterns,
    BulkActionEditType.delete_index_patterns,
    BulkActionEditType.set_index_patterns,
  ].includes(editAction);

const isTagsForm = (editAction: BulkActionEditType) =>
  [
    BulkActionEditType.add_tags,
    BulkActionEditType.delete_tags,
    BulkActionEditType.set_tags,
  ].includes(editAction);

interface Props {
  onClose: () => void;
  onConfirm: (bulkactionEditPayload: BulkActionEditPayload) => void;
  editAction: BulkActionEditType;
  rulesCount: number;
}

const BulkEditFlyoutComponent = ({ onClose, onConfirm, editAction, rulesCount }: Props) => {
  const {
    schema,
    Component: FormFieldsComponent,
    initialFormData,
    formTitle,
  } = useMemo(() => {
    if (isIndexPatternsForm(editAction)) {
      return indexPatternsFormConfiguration(editAction);
    }
    if (isTagsForm(editAction)) {
      return tagsFormConfiguration(editAction);
    }
    throw Error('Edit action is not valid');
  }, [editAction]);

  const { form } = useForm<typeof initialFormData>({
    defaultValue: initialFormData,
    schema,
  });

  const handleSave = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    let payload;

    if ('tags' in data) {
      payload = tagsFormDataToEditActionPayload(data, editAction);
    } else if ('index' in data) {
      payload = indexPatternsFormDataToEditActionPayload(data, editAction);
    } else {
      return;
    }

    onConfirm(payload);
  };

  const { isValid } = form;

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={formTitle} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{formTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Form form={form}>
          <FormFieldsComponent rulesCount={rulesCount} editAction={editAction} form={form} />
        </Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              {i18n.BULK_EDIT_FLYOUT_FORM_CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleSave} fill disabled={isValid === false}>
              {i18n.BULK_EDIT_FLYOUT_FORM_SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const BulkEditFlyout = React.memo(BulkEditFlyoutComponent);

BulkEditFlyout.displayName = 'BulkEditFlyout';
