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
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useHostIsolationExceptionsSelector } from '../hooks';
import {
  NAME_ERROR,
  NAME_LABEL,
  NAME_PLACEHOLDER,
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  IP_ERROR,
  IP_LABEL,
  IP_PLACEHOLDER,
} from './translations';

export const HostIsolationExceptionsForm: React.FC<{}> = () => {
  // const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();
  const exception = useHostIsolationExceptionsSelector((state) => state.form.entry);
  const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
  const [hasBeenInputIpVisited, setHasBeenInputIpVisited] = useState(false);
  const [hasNameError, setHasNameError] = useState(false);
  const [hasIpError, setHasIpError] = useState(false);
  const [exceptionName, setExeptionName] = useState(exception?.name);
  const [exceptionDescription, setExeptionDescription] = useState(exception?.description);
  // TODO fix this
  const [exceptionIp, setExeptionIp] = useState(exception?.entries[0]?.value);

  const handleOnChangeName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.value;
      if (!name.trim()) {
        setHasNameError(true);
        return;
      }
      setHasNameError(false);
      setExeptionName(name);
    },
    [setHasNameError, setExeptionName]
  );

  const handleOnIpChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const ip = event.target.value;
      // TODO validate IP somehow with CIDR
      if (!ip.trim()) {
        setHasIpError(true);
        return;
      }
      setHasIpError(false);
      setExeptionIp(ip);
    },
    [setHasIpError, setExeptionIp]
  );

  const handleOnDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExeptionDescription(event.target.value);
  }, []);

  const nameInput = useMemo(
    () => (
      <EuiFormRow
        label={NAME_LABEL}
        fullWidth
        isInvalid={hasNameError && hasBeenInputNameVisited}
        error={NAME_ERROR}
      >
        <EuiFieldText
          id="eventFiltersFormInputName"
          placeholder={NAME_PLACEHOLDER}
          defaultValue={exceptionName ?? ''}
          onChange={handleOnChangeName}
          fullWidth
          aria-label={NAME_PLACEHOLDER}
          required={hasBeenInputNameVisited}
          maxLength={256}
          onBlur={() => !hasBeenInputNameVisited && setHasBeenInputNameVisited(true)}
        />
      </EuiFormRow>
    ),
    [hasNameError, exceptionName, hasBeenInputNameVisited, handleOnChangeName]
  );

  const ipInput = useMemo(
    () => (
      <EuiFormRow
        label={IP_LABEL}
        fullWidth
        isInvalid={hasIpError && hasBeenInputIpVisited}
        error={IP_ERROR}
      >
        <EuiFieldText
          id="eventFiltersFormInputName"
          placeholder={IP_PLACEHOLDER}
          defaultValue={exceptionIp ?? ''}
          onChange={handleOnIpChange}
          fullWidth
          aria-label={IP_PLACEHOLDER}
          required={hasBeenInputIpVisited}
          maxLength={256}
          onBlur={() => !hasBeenInputIpVisited && setHasBeenInputIpVisited(true)}
        />
      </EuiFormRow>
    ),
    [hasIpError, hasBeenInputIpVisited, exceptionIp, handleOnIpChange]
  );

  // TOOD - this should be an area text
  const descriptionInput = useMemo(
    () => (
      <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
        <EuiTextArea
          id="eventFiltersFormInputName"
          placeholder={DESCRIPTION_PLACEHOLDER}
          defaultValue={exceptionIp ?? ''}
          onChange={handleOnDescriptionChange}
          fullWidth
          aria-label={DESCRIPTION_PLACEHOLDER}
          maxLength={256}
        />
      </EuiFormRow>
    ),
    [exceptionIp, handleOnDescriptionChange]
  );

  return (
    <EuiForm component="div">
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
          defaultMessage="Adds an IP to the Host Isolation Exceptions. Only accepts IPv4 with optional CIDR"
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
          defaultMessage="IP exceptions will apply to all OS Types"
        />
      </EuiText>
      <EuiSpacer size="m" />
      {ipInput}
    </EuiForm>
  );
};

HostIsolationExceptionsForm.displayName = 'HostIsolationExceptionsForm';
