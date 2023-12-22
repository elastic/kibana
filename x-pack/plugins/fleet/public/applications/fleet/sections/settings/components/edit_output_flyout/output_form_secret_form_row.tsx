/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export const SecretFormRow: React.FC<{
  fullWidth?: boolean;
  children: ConstructorParameters<typeof EuiFormRow>[0]['children'];
  error?: string[];
  isInvalid?: boolean;
  title: string;
  clear: () => void;
  initialValue?: any;
  onUsePlainText: () => void;
  cancelEdit: () => void;
}> = ({
  fullWidth,
  error,
  isInvalid,
  children,
  clear,
  title,
  initialValue,
  onUsePlainText,
  cancelEdit,
}) => {
  const hasInitialValue = !!initialValue;
  const [editMode, setEditMode] = useState(!initialValue);
  const valueHiddenPanel = (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fleet.outputForm.secretValueHiddenMessage"
          defaultMessage="The saved {varName} is hidden. You can only replace the {varName}."
          values={{
            varName: title,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        onClick={() => setEditMode(true)}
        color="primary"
        iconType="refresh"
        iconSide="left"
        size="xs"
      >
        <FormattedMessage
          id="xpack.fleet.outputForm.editSecretValue"
          defaultMessage="Replace {varName}"
          values={{
            varName: title,
          }}
        />
      </EuiButtonEmpty>
    </EuiPanel>
  );

  const cancelButton = (
    <EuiButtonEmpty
      onClick={() => {
        setEditMode(false);
        cancelEdit();
      }}
      color="primary"
      iconType="refresh"
      iconSide="left"
      size="xs"
    >
      <FormattedMessage
        id="xpack.fleet.editPackagePolicy.stepConfigure.fieldSecretValueSetCancelButton"
        defaultMessage="Cancel {varName} change"
        values={{
          varName: title,
        }}
      />
    </EuiButtonEmpty>
  );

  const editValue = (
    <>
      {children}
      {hasInitialValue && (
        <EuiFlexGroup justifyContent="flexEnd" data-test-subj="secretCancelChangeBtn">
          <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );

  const label = (
    <span>
      <EuiIcon type="lock" />
      &nbsp;
      {title}
      &nbsp;
      <EuiToolTip
        content={i18n.translate('xpack.fleet.settings.editOutputFlyout.sslKeySecretInputTooltip', {
          defaultMessage:
            'This value will be stored as a secret, meaning once saved the value cannot be viewed again',
        })}
      >
        <EuiIcon type="questionInCircle" />
      </EuiToolTip>
    </span>
  );

  const helpText = !initialValue ? (
    <FormattedMessage
      id="xpack.fleet.settings.editOutputFlyout.sslKeySecretInputCalloutTitle"
      defaultMessage="This field uses secret storage and requires Fleet Server v8.12.0 and above. {revertLink}"
      values={{
        revertLink: (
          <EuiButtonEmpty onClick={onUsePlainText} color="primary" size="xs">
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.revertToPlaintextLink"
              defaultMessage="Click to use plain text storage instead"
            />
          </EuiButtonEmpty>
        ),
      }}
    />
  ) : undefined;

  const inputComponent = editMode ? editValue : valueHiddenPanel;

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      label={label}
      error={error}
      isInvalid={isInvalid}
      helpText={helpText}
    >
      {inputComponent}
    </EuiFormRow>
  );
};
