/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiFlyoutSize } from '@elastic/eui';
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

import type { FormHook } from '../../../../../../shared_imports';
import { Form } from '../../../../../../shared_imports';

import * as i18n from '../../../../../../detections/pages/detection_engine/rules/translations';

interface BulkEditFormWrapperProps {
  form: FormHook;
  title: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  flyoutSize?: EuiFlyoutSize;
}

const BulkEditFormWrapperComponent: FC<BulkEditFormWrapperProps> = ({
  form,
  title,
  banner,
  children,
  onClose,
  onSubmit,
  flyoutSize = 's',
}) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'RulesBulkEditForm',
  });

  const { isValid } = form;
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={simpleFlyoutTitleId} size={flyoutSize}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" data-test-subj="rulesBulkEditFormTitle">
          <h2 id={simpleFlyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody banner={banner}>
        <Form form={form}>{children}</Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="rulesBulkEditFormCancelBtn"
            >
              {i18n.BULK_EDIT_FLYOUT_FORM_CANCEL}
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
