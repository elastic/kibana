/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export const SecretFormRow: React.FC<{
  fullWidth?: boolean;
  children: ConstructorParameters<typeof EuiFormRow>[0]['children'];
  useSecretsStorage: boolean;
  isConvertedToSecret?: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
  error?: string[];
  isInvalid?: boolean;
  title?: string;
  clear?: () => void;
  initialValue?: any;
  cancelEdit?: () => void;
  label?: JSX.Element;
}> = ({
  fullWidth,
  error,
  isInvalid,
  children,
  clear,
  title,
  initialValue,
  onToggleSecretStorage,
  cancelEdit,
  useSecretsStorage,
  isConvertedToSecret = false,
  label,
}) => {
  const hasInitialValue = !!initialValue;
  const [editMode, setEditMode] = useState(isConvertedToSecret || !initialValue);
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
        if (cancelEdit) cancelEdit();
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
      {hasInitialValue && !isConvertedToSecret && (
        <EuiFlexGroup justifyContent="flexEnd" data-test-subj="secretCancelChangeBtn">
          <EuiFlexItem grow={false}>{cancelButton}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );

  const secretLabel = (
    <>
      <EuiIcon type="lock" data-test-subj="lockIcon" />
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
    </>
  );

  const helpText = useMemo(() => {
    if (isConvertedToSecret)
      return (
        <EuiCallOut size="s" color="warning">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.sslKeySecretInputConvertedCalloutTitle"
            defaultMessage="This field will be re-saved using secret storage from plain text storage. Secrets storage requires Fleet Server v8.12.0 and above. {revertLink}"
            values={{
              revertLink: (
                <EuiLink onClick={() => onToggleSecretStorage(false)} color="primary">
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.revertToPlaintextLink"
                    defaultMessage="Click to use plain text storage instead"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      );

    if (!initialValue)
      return (
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.sslKeySecretInputCalloutTitle"
          defaultMessage="This field uses secret storage and requires Fleet Server v8.12.0 and above. {revertLink}"
          values={{
            revertLink: (
              <EuiLink onClick={() => onToggleSecretStorage(false)} color="primary">
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.revertToPlaintextLink"
                  defaultMessage="Click to use plain text storage instead"
                />
              </EuiLink>
            ),
          }}
        />
      );
    return undefined;
  }, [initialValue, isConvertedToSecret, onToggleSecretStorage]);

  const plainTextHelp = (
    <FormattedMessage
      id="xpack.fleet.settings.editOutputFlyout.secretInputCalloutTitle"
      defaultMessage="This field should be stored as a secret, currently it is set to be stored as plain text. {enableSecretLink}"
      values={{
        enableSecretLink: (
          <EuiLink onClick={() => onToggleSecretStorage(true)} color="primary">
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.revertToSecretStorageLink"
              defaultMessage="Click to use secret storage instead"
            />
          </EuiLink>
        ),
      }}
    />
  );

  const inputComponent = editMode ? editValue : valueHiddenPanel;

  return useSecretsStorage ? (
    <EuiFormRow
      fullWidth={fullWidth}
      label={secretLabel}
      error={error}
      isInvalid={isInvalid}
      helpText={helpText}
    >
      {inputComponent}
    </EuiFormRow>
  ) : (
    <EuiFormRow
      fullWidth={fullWidth}
      error={error}
      isInvalid={isInvalid}
      label={label}
      helpText={plainTextHelp}
    >
      {inputComponent}
    </EuiFormRow>
  );
};
