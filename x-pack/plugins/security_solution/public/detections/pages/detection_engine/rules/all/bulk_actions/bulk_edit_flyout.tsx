/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
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
import * as i18n from '../../translations';

import {
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

import { IndexPatternsForm } from './forms/index_patterns_form';
import { TagsForm } from './forms/tags_form';

import { initialState, FormState } from './forms/use_parent_state_form';

interface Props {
  onClose: () => void;
  onConfirm: (bulkactionEditPayload: BulkActionEditPayload) => void;
  editAction: BulkActionEditType;
  rulesCount: number;
}

const BulkEditFlyoutComponent = ({ onClose, onConfirm, editAction, rulesCount }: Props) => {
  const [formState, setFormState] = useState<FormState>(initialState);

  const handleSave = async () => {
    const isValid = await formState.validate();
    if (isValid) {
      onConfirm(formState.getEditActionPayload());
    }
  };

  const sendForm = useCallback(
    async (updatedFormState: FormState) => {
      setFormState(updatedFormState);
    },
    [setFormState]
  );
  const { isValid } = formState;

  const formSwitch = useMemo(() => {
    switch (editAction) {
      case BulkActionEditType.add_index_patterns:
      case BulkActionEditType.delete_index_patterns:
      case BulkActionEditType.set_index_patterns:
        return (
          <IndexPatternsForm onChange={sendForm} editAction={editAction} rulesCount={rulesCount} />
        );

      case BulkActionEditType.add_tags:
      case BulkActionEditType.delete_tags:
      case BulkActionEditType.set_tags:
        return <TagsForm onChange={sendForm} editAction={editAction} rulesCount={rulesCount} />;

      default:
        return null;
    }
  }, [sendForm, editAction, rulesCount]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={formState.formTitle ?? undefined}
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{formState.formTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{formSwitch}</EuiFlyoutBody>
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
