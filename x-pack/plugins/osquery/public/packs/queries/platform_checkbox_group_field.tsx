/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../shared_imports';
import { PlatformIcon } from './platforms/platform_icon';

interface Props {
  field: FieldHook<string>;
  euiFieldProps?: Record<string, unknown>;
  idAria?: string;
  [key: string]: unknown;
}

export const PlatformCheckBoxGroupField = ({
  field,
  euiFieldProps = {},
  idAria,
  ...rest
}: Props) => {
  const options = useMemo(
    () => [
      {
        id: 'linux',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="linux" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformMacOSLabel"
                defaultMessage="Linux"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'darwin',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="darwin" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformLinusLabel"
                defaultMessage="macOS"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'windows',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="windows" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformWindowsLabel"
                defaultMessage="Windows"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    []
  );

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    () =>
      (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
        acc[option.id] = isEmpty(field.value) ? true : field.value?.includes(option.id) ?? false;

        return acc;
      }, {} as Record<string, boolean>)
  );

  const onChange = useCallback(
    (optionId: string) => {
      const newCheckboxIdToSelectedMap = {
        ...checkboxIdToSelectedMap,
        [optionId]: !checkboxIdToSelectedMap[optionId],
      };
      setCheckboxIdToSelectedMap(newCheckboxIdToSelectedMap);

      field.setValue(() =>
        Object.keys(pickBy(newCheckboxIdToSelectedMap, (value) => value === true)).join(',')
      );
    },
    [checkboxIdToSelectedMap, field]
  );

  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  useEffect(() => {
    setCheckboxIdToSelectedMap(() =>
      (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
        acc[option.id] = isEmpty(field.value) ? true : field.value?.includes(option.id) ?? false;

        return acc;
      }, {} as Record<string, boolean>)
    );
  }, [field.value, options]);

  return (
    <EuiFormRow
      label={field.label}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={describedByIds}
      {...rest}
    >
      <EuiCheckboxGroup
        idToSelectedMap={checkboxIdToSelectedMap}
        options={options}
        onChange={onChange}
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
