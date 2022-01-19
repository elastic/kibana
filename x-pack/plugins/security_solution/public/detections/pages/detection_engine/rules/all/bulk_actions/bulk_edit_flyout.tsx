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

interface Props {
  onClose: () => void;
  onConfirm: (bulkactionEditPayload: BulkActionEditPayload) => void;
  editAction: BulkActionEditType;
  rulesCount: number;
}

const BulkEditFlyoutComponent = ({ onClose, onConfirm, editAction, rulesCount }: Props) => {
  const {
    schema,
    Component: FormComponent,
    initialFormData,
    formTitle,
  } = useMemo(() => {
    switch (editAction) {
      case BulkActionEditType.add_index_patterns:
      case BulkActionEditType.delete_index_patterns:
      case BulkActionEditType.set_index_patterns:
        return indexPatternsFormConfiguration(editAction);

      case BulkActionEditType.add_tags:
      case BulkActionEditType.delete_tags:
      case BulkActionEditType.set_tags:
        return tagsFormConfiguration(editAction);

      default:
        throw Error('No available action');
    }
  }, [editAction]);

  const { form } = useForm<typeof initialFormData>({
    defaultValue: initialFormData,
    schema,
  });

  const handleSave = async () => {
    const isValid = await form.validate();
    if (isValid) {
      const data = form.getFormData();
      let payload;
      if ('tags' in data) {
        payload = tagsFormDataToEditActionPayload(data, editAction);
      }

      if ('index' in data) {
        payload = indexPatternsFormDataToEditActionPayload(data, editAction);
      }

      if (payload) {
        onConfirm(payload);
      }
    }
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
          <FormComponent rulesCount={rulesCount} editAction={editAction} form={form} />
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
