/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  useGeneratedHtmlId,
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

import { Form, FormHook } from '../../../../../../../shared_imports';

import * as i18n from '../../../translations';

interface BulkEditFormWrapperProps {
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  form: FormHook;
  children: React.ReactNode;
}

const BulkEditFormWrapperComponent: FC<BulkEditFormWrapperProps> = ({
  form,
  onClose,
  onSubmit,
  children,
  title,
}) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'RulesBulkEditForm',
  });

  const { isValid } = form;
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={simpleFlyoutTitleId} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" data-test-subj="rulesBulkEditFormTitle">
          <h2 id={simpleFlyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Form form={form}>{children}</Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="rulesBulkEditFormCancelBtn"
            >
              {i18n.BULK_EDIT_FLYOUT_FORM_CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSubmit}
              fill
              disabled={isValid === false}
              data-test-subj="rulesBulkEditFormSaveBtn"
            >
              {i18n.BULK_EDIT_FLYOUT_FORM_SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const BulkEditFormWrapper = React.memo(BulkEditFormWrapperComponent);

BulkEditFormWrapper.displayName = 'BulkEditFormWrapper';
