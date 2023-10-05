/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaHeaders: React.FunctionComponent<{ inputs: OutputFormInputsType }> = (
  props
) => {
  const { inputs } = props;
  const {
    props: { onChange },
    value: keyValuePairs,
    formRowProps: { error: errors },
  } = inputs.kafkaHeadersInput;

  const [autoFocus, setAutoFocus] = useState(false);

  const handleKeyValuePairChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      const updatedPairs = keyValuePairs.map((pair, i) => {
        if (i === index) {
          return {
            ...pair,
            [field]: value,
          };
        }
        return pair;
      });
      onChange(updatedPairs);
    },
    [keyValuePairs, onChange]
  );

  const addKeyValuePair = useCallback(() => {
    setAutoFocus(true);
    const updatedPairs = [...keyValuePairs, { key: '', value: '' }];
    onChange(updatedPairs);
  }, [keyValuePairs, onChange]);

  const deleteKeyValuePair = useCallback(
    (index: number) => {
      const updatedPairs = keyValuePairs.filter((_, i) => i !== index);
      onChange(updatedPairs);
    },
    [keyValuePairs, onChange]
  );

  const deleteButtonDisabled = keyValuePairs.length === 1;
  const addKeyValuePairButtonDisabled =
    keyValuePairs.length === 1 && (keyValuePairs[0].key === '' || keyValuePairs[0].value === '');

  const displayErrors = (errorMessages?: string[]) => {
    return errorMessages?.length
      ? errorMessages.map((item, idx) => <EuiFormErrorText key={idx}>{item}</EuiFormErrorText>)
      : null;
  };

  const matchErrorsByIndex = useMemo(
    () => (index: number, errorType: 'key' | 'value') => {
      const headersErrors = errors as
        | Array<{
            message: string;
            index: number;
            hasKeyError: boolean;
            hasValueError: boolean;
          }>
        | undefined;
      return headersErrors
        ?.filter(
          (error) =>
            error.index === index && (errorType === 'key' ? error.hasKeyError : error.hasValueError)
        )
        .map((error) => error.message);
    },
    [errors]
  );

  const globalErrors = useMemo(() => {
    return errors && errors.filter((err) => err.index === undefined).map(({ message }) => message);
  }, [errors]);

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaHeadersPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaHeaders">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersTitle"
            defaultMessage="Headers"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {keyValuePairs.map((pair, index) => {
        const keyErrors = matchErrorsByIndex(index, 'key');
        const valueErrors = matchErrorsByIndex(index, 'value');
        return (
          <div key={index}>
            {index > 0 && <EuiSpacer size="m" />}
            <EuiFlexGroup alignItems="flexStart" gutterSize="none" style={{ gap: 30 }}>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.kafkaHeaderKeyInputLabel"
                      defaultMessage="Key"
                    />
                  }
                  error={displayErrors(keyErrors)}
                  isInvalid={(keyErrors?.length ?? 0) > 0}
                >
                  <EuiFieldText
                    data-test-subj={`settingsOutputsFlyout.kafkaHeadersKeyInput${index}`}
                    fullWidth
                    value={pair.key}
                    onChange={(e) => handleKeyValuePairChange(index, 'key', e.target.value)}
                    autoFocus={autoFocus}
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.kafkaHeaderValueInputLabel"
                      defaultMessage="Value"
                    />
                  }
                  error={displayErrors(valueErrors)}
                  isInvalid={(valueErrors?.length ?? 0) > 0}
                >
                  <EuiFieldText
                    data-test-subj={`settingsOutputsFlyout.kafkaHeadersValueInput${index}`}
                    fullWidth
                    value={pair.value}
                    onChange={(e) => handleKeyValuePairChange(index, 'value', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ marginTop: 28 }}>
                <EuiButtonIcon
                  data-test-subj={`settingsOutputsFlyout.kafkaHeadersDeleteButton${index}`}
                  color="text"
                  onClick={() => deleteKeyValuePair(index)}
                  iconType="cross"
                  disabled={deleteButtonDisabled}
                  aria-label={i18n.translate('xpack.fleet.kafkaHeadersInput.deleteButton', {
                    defaultMessage: 'Delete row',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}
      {displayErrors(globalErrors)}

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        data-test-subj="kafkaHeaders.multiRowInput.addRowButton"
        disabled={addKeyValuePairButtonDisabled}
        size="xs"
        flush="left"
        iconType="plusInCircle"
        onClick={addKeyValuePair}
      >
        <FormattedMessage id="xpack.fleet.kafkaHeadersInput.addRow" defaultMessage="Add header" />
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaClientIdLabel"
            defaultMessage="Client ID"
          />
        }
        {...inputs.kafkaClientIdInput.formRowProps}
      >
        <EuiFieldText
          data-test-subj="settingsOutputsFlyout.kafkaClientIdInput"
          fullWidth
          {...inputs.kafkaClientIdInput.props}
        />
      </EuiFormRow>
    </EuiPanel>
  );
};
