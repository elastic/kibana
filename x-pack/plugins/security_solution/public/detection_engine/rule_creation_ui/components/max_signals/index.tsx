/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiTextColor, EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { css } from '@emotion/css';
import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';

interface MaxSignalsFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  placeholder?: string;
}

const MAX_SIGNALS_FIELD_WIDTH = 200;

export const MaxSignals: React.FC<MaxSignalsFieldProps> = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  placeholder,
}): JSX.Element => {
  const { setValue, value } = field;
  const { alerting } = useKibana().services;
  const maxAlertsPerRun = alerting.getMaxAlertsPerRun() ?? 1000; // Defaults to 1000 in the alerting framework config

  const [isInvalid, error] = useMemo(() => {
    if (typeof value === 'number' && !isNaN(value) && value <= 0) {
      return [true, i18n.GREATER_THAN_ERROR];
    }
    return [false];
  }, [value]);

  const hasWarning = useMemo(
    () => typeof value === 'number' && !isNaN(value) && value > maxAlertsPerRun,
    [maxAlertsPerRun, value]
  );

  const handleMaxSignalsChange: EuiFieldNumberProps['onChange'] = useCallback(
    (e) => {
      const maxSignalsValue = (e.target as HTMLInputElement).value;
      // Has to handle an empty string as the field is optional
      setValue(maxSignalsValue !== '' ? Number(maxSignalsValue.trim()) : '');
    },
    [setValue]
  );

  const helpText = useMemo(() => {
    const textToRender = [];
    if (hasWarning) {
      textToRender.push(
        <EuiTextColor color="warning">{i18n.LESS_THAN_WARNING(maxAlertsPerRun)}</EuiTextColor>
      );
    }
    const defaultToNumber =
      maxAlertsPerRun < DEFAULT_MAX_SIGNALS ? maxAlertsPerRun : DEFAULT_MAX_SIGNALS;
    textToRender.push(i18n.MAX_SIGNALS_HELP_TEXT(defaultToNumber));
    return textToRender;
  }, [hasWarning, maxAlertsPerRun]);

  return (
    <EuiFormRow
      css={css`
        .euiFormControlLayout {
          width: ${MAX_SIGNALS_FIELD_WIDTH}px;
        }
      `}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      fullWidth
      helpText={helpText}
      label={field.label}
      labelAppend={field.labelAppend}
      isInvalid={isInvalid}
      error={error}
    >
      <EuiFieldNumber
        // This css is need until https://github.com/elastic/eui/pull/7666 gets merged in and kibana is updated to the new version of Eui
        css={css`
          padding-right: 40px;
          padding-left: 12px;
        `}
        isInvalid={isInvalid}
        value={value as EuiFieldNumberProps['value']}
        onChange={handleMaxSignalsChange}
        isLoading={field.isValidating}
        data-test-subj="input"
        placeholder={placeholder}
        disabled={isDisabled}
        // @ts-ignore This is need until https://github.com/elastic/eui/pull/7666 gets merged in and kibana is updated to the new version of Eui
        icon={hasWarning ? { side: 'right', type: 'warning', color: 'warning' } : undefined}
      />
    </EuiFormRow>
  );
};

MaxSignals.displayName = 'MaxSignals';
