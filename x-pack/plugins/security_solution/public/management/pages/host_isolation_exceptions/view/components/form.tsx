/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { isValidIPv4OrCIDR } from '../../../../../../common/endpoint/utils/is_valid_ip';
import {
  EffectedPolicySelect,
  EffectedPolicySelection,
  EffectedPolicySelectProps,
} from '../../../../components/effected_policy_select';
import {
  getArtifactTagsByEffectedPolicySelection,
  getArtifactTagsWithoutPolicies,
  getEffectedPolicySelectionByTags,
  isGlobalPolicyEffected,
} from '../../../../components/effected_policy_select/utils';
import {
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  IP_ERROR,
  IP_LABEL,
  IP_PLACEHOLDER,
  NAME_ERROR,
  NAME_LABEL,
  NAME_PLACEHOLDER,
} from './translations';
import { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { FormattedError } from '../../../../components/formatted_error';
import { createEmptyHostIsolationException } from '../../utils';

interface ExceptionIpEntry {
  field: 'destination.ip';
  operator: 'included';
  type: 'match';
  value: string;
}

export const HostIsolationExceptionsForm = memo<ArtifactFormComponentProps>(
  ({ item: exception, onChange, policies, disabled, mode, error }) => {
    const ipEntry = useMemo(() => {
      return (
        (exception.entries[0] as ExceptionIpEntry) || createEmptyHostIsolationException().entries[0]
      );
    }, [exception.entries]);

    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const [hasBeenInputIpVisited, setHasBeenInputIpVisited] = useState(false);
    const [hasNameError, setHasNameError] = useState(!exception.name);
    const [hasIpError, setHasIpError] = useState(!ipEntry.value);

    const [selectedPolicies, setSelectedPolicies] = useState<EffectedPolicySelection>({
      isGlobal: isGlobalPolicyEffected(exception.tags),
      selected: [],
    });

    const isFormContentValid = useMemo(() => {
      return !hasNameError && !hasIpError;
    }, [hasIpError, hasNameError]);

    const notifyOfChange = useCallback(
      (updatedItem?: Partial<ArtifactFormComponentProps['item']>) => {
        onChange({
          item: updatedItem
            ? {
                ...exception,
                ...updatedItem,
              }
            : exception,
          isValid: isFormContentValid,
        });
      },
      [exception, isFormContentValid, onChange]
    );

    const handleOnChangeName = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        if (!name.trim()) {
          setHasNameError(true);
        } else {
          setHasNameError(false);
        }
        notifyOfChange({ name });
      },
      [notifyOfChange]
    );

    const handleOnIpChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const ip = event.target.value;

        if (!isValidIPv4OrCIDR(ip)) {
          setHasIpError(true);
        } else {
          setHasIpError(false);
        }

        notifyOfChange({
          entries: [
            {
              ...ipEntry,
              value: ip,
            },
          ],
        });
      },
      [ipEntry, notifyOfChange]
    );

    const handlePolicySelectChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (selection) => {
        // preserve the previous selection between global and not global toggle
        if (selection.isGlobal) {
          setSelectedPolicies({ isGlobal: true, selected: selection.selected });
        } else {
          setSelectedPolicies(selection);
        }

        notifyOfChange({
          tags: getArtifactTagsByEffectedPolicySelection(
            selection,
            getArtifactTagsWithoutPolicies(exception.tags)
          ),
        });
      },
      [exception.tags, notifyOfChange]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        notifyOfChange({ description: event.target.value });
      },
      [notifyOfChange]
    );

    const nameInput = useMemo(
      () => (
        <EuiFormRow
          label={NAME_LABEL}
          fullWidth
          isInvalid={hasNameError && hasBeenInputNameVisited}
          error={NAME_ERROR}
          isDisabled={disabled}
        >
          <EuiFieldText
            id="eventFiltersFormInputName"
            placeholder={NAME_PLACEHOLDER}
            defaultValue={exception.name ?? ''}
            onChange={handleOnChangeName}
            fullWidth
            aria-label={NAME_PLACEHOLDER}
            required={hasBeenInputNameVisited}
            maxLength={256}
            data-test-subj="hostIsolationExceptions-form-name-input"
            onBlur={() => !hasBeenInputNameVisited && setHasBeenInputNameVisited(true)}
            disabled={disabled}
          />
        </EuiFormRow>
      ),
      [disabled, exception.name, handleOnChangeName, hasBeenInputNameVisited, hasNameError]
    );

    const ipInput = useMemo(
      () => (
        <EuiFormRow
          label={IP_LABEL}
          fullWidth
          isInvalid={hasIpError && hasBeenInputIpVisited}
          error={IP_ERROR}
          isDisabled={disabled}
        >
          <EuiFieldText
            id="eventFiltersFormInputName"
            placeholder={IP_PLACEHOLDER}
            defaultValue={(exception.entries?.[0] as ExceptionIpEntry)?.value ?? ''}
            onChange={handleOnIpChange}
            fullWidth
            aria-label={IP_PLACEHOLDER}
            required={hasBeenInputIpVisited}
            maxLength={256}
            data-test-subj="hostIsolationExceptions-form-ip-input"
            onBlur={() => !hasBeenInputIpVisited && setHasBeenInputIpVisited(true)}
            disabled={disabled}
          />
        </EuiFormRow>
      ),
      [disabled, exception.entries, handleOnIpChange, hasBeenInputIpVisited, hasIpError]
    );

    const descriptionInput = useMemo(
      () => (
        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth isDisabled={disabled}>
          <EuiTextArea
            id="eventFiltersFormInputName"
            placeholder={DESCRIPTION_PLACEHOLDER}
            defaultValue={exception.description ?? ''}
            onChange={handleOnDescriptionChange}
            fullWidth
            data-test-subj="hostIsolationExceptions-form-description-input"
            aria-label={DESCRIPTION_PLACEHOLDER}
            maxLength={256}
            disabled={disabled}
          />
        </EuiFormRow>
      ),
      [disabled, exception.description, handleOnDescriptionChange]
    );

    // set current policies if not previously selected
    useEffect(() => {
      if (selectedPolicies.selected.length === 0 && exception.tags) {
        setSelectedPolicies(getEffectedPolicySelectionByTags(exception.tags, policies));
      }
    }, [exception.tags, policies, selectedPolicies.selected.length]);

    // Anytime the `notificyOfChange()` is re-defined, call it with current values.
    // This will happen
    useEffect(() => {
      notifyOfChange(); // << Important to call it with no arguments, so that existing values are sent
    }, [notifyOfChange]);

    // Make sure in the create flow, the OS array is set to the 3 OSs supported
    useEffect(() => {
      if (mode === 'create' && (exception.os_types?.length ?? 0) !== 3) {
        notifyOfChange({ os_types: createEmptyHostIsolationException().os_types });
      }
    }, [exception.os_types?.length, mode, notifyOfChange]);

    return (
      <EuiForm
        component="div"
        error={error && <FormattedError error={error} />}
        isInvalid={!!error}
      >
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.form.title"
              defaultMessage="Details"
            />
          </h2>
        </EuiTitle>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.form.description"
            defaultMessage="Allows isolated hosts to connect to these IP addresses. Only accepts IPv4 with optional CIDR."
          />
        </EuiText>
        <EuiSpacer size="m" />
        {nameInput}
        {descriptionInput}
        <EuiSpacer size="m" />
        <EuiHorizontalRule />
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.form.conditions.title"
              defaultMessage="Conditions"
            />
          </h2>
        </EuiTitle>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.form.conditions.subtitle"
            defaultMessage="Host Isolation exceptions will apply to all operating systems."
          />
        </EuiText>
        <EuiSpacer size="m" />
        {ipInput}
        <EuiHorizontalRule />
        <EuiFormRow
          fullWidth={true}
          data-test-subj={'effectedPolicies-container'}
          isDisabled={disabled}
        >
          <EffectedPolicySelect
            isGlobal={selectedPolicies.isGlobal}
            isPlatinumPlus={true}
            selected={selectedPolicies.selected}
            options={policies}
            onChange={handlePolicySelectChange}
            data-test-subj={'effectedPolicies-select'}
            disabled={disabled}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

HostIsolationExceptionsForm.displayName = 'HostIsolationExceptionsForm';
