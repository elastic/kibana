/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import ReactMarkdown from 'react-markdown';
import { RESPONSE_SUPPORTED_ACTION_TYPES_IDS } from '../../../../../common/constants';
import { FORM_ERRORS_TITLE } from '../rule_actions_field/translations';
import { getLazyResponseActionForm } from '../../response_actions/get_response_action_form';

interface Props {
  items: any[];
  addItem: () => void;
  removeItem: () => void;
}

export interface ResponseActionValue {
  actionTypeId: string;
  id: string;
  params: Record<string, unknown>;
}

export interface ResponseActionType {
  id: string;
  name: string;
  iconClass: string;
  // enabled: boolean;
  // enabledInConfig: boolean;
  // enabledInLicense: boolean;
  // minimumLicenseRequired: LicenseType;
}

export const getSupportedResponseActions = (
  actionTypes: ResponseActionType[]
): ResponseActionType[] => {
  return actionTypes.filter((actionType) => {
    return RESPONSE_SUPPORTED_ACTION_TYPES_IDS.includes(actionType.id);
  });
};

export const RuleResponseActionsField: React.FC<Props> = ({ items, addItem, removeItem }) => {
  console.log({ items, addItem, removeItem });
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const [supportedResponseActionTypes, setSupportedResponseActionTypes] = useState<
    ResponseActionType[] | undefined
  >();

  // const actions: any[] = useMemo(() => {
  //   return !isEmpty(field.value) ? (field.value as any[]) : [];
  // }, [field.value]);

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      return [];
    },
    []
    //   console.log({ key, value, index });
    //   field.setValue((prevValue: ResponseActionValue[]) => {
    //     const updatedActions = [...prevValue];
    //     updatedActions[index] = {
    //       ...updatedActions[index],
    //       params: {
    //         ...updatedActions[index].params,
    //         [key]: value,
    //       },
    //     };
    //     return updatedActions;
    //   });
    // },
    // // eslint-disable-next-line react-hooks/exhaustive-deps
    // [field.setValue]
  );

  const responseActionForm = useMemo(
    () =>
      getLazyResponseActionForm({
        actions: items,
        supportedResponseActions: supportedResponseActionTypes,
        updateAction: setActionParamsProperty,
        addItem,
        removeItem,
      }),
    [addItem, items, removeItem, setActionParamsProperty, supportedResponseActionTypes]
  );

  useEffect(() => {
    const responseActionTypes = [
      { id: '.osquery', name: 'osquery', iconClass: 'logoOsquery' },
      { id: '.endpointSecurity', name: 'endpointSecurity', iconClass: 'logoSecurity' },
    ];
    const supportedTypes = getSupportedResponseActions(responseActionTypes);
    setSupportedResponseActionTypes(supportedTypes);
  }, []);

  useEffect(() => {}, []);
  //   if (isSubmitting || !field.errors.length) {
  //     return setFieldErrors(null);
  //   }
  //   if (isSubmitted && !isSubmitting && isValid === false && field.errors.length) {
  //     const errorsString = field.errors.map(({ message }) => message).join('\n');
  //     return setFieldErrors(errorsString);
  //   }
  // }, [field.isChangingValue, field.errors, setFieldErrors, isSubmitting, isSubmitted, isValid]);

  if (!supportedResponseActionTypes) return <></>;

  return (
    <>
      {fieldErrors ? (
        <>
          <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="alert">
            <ReactMarkdown source={fieldErrors} />
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      {responseActionForm}
    </>
  );
};
