/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSelect,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { SLOResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { v4 } from 'uuid';
import { FormattedMessage } from '@kbn/i18n-react';
import { Duration, WindowSchema } from '../../typings';
import { BurnRate } from './burn_rate';
import { LongWindowDuration } from './long_window_duration';
import { toMinutes, toDuration } from '../../utils/slo/duration';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../common/constants';
import { WindowResult } from './validation';

interface WindowProps extends WindowSchema {
  slo?: SLOResponse;
  onChange: (windowDef: WindowSchema) => void;
  onDelete: (id: string) => void;
  disableDelete: boolean;
  errors: WindowResult;
}

const ACTION_GROUP_OPTIONS = [
  { value: ALERT_ACTION.id, text: ALERT_ACTION.name },
  { value: HIGH_PRIORITY_ACTION.id, text: HIGH_PRIORITY_ACTION.name },
  { value: MEDIUM_PRIORITY_ACTION.id, text: MEDIUM_PRIORITY_ACTION.name },
  { value: LOW_PRIORITY_ACTION.id, text: LOW_PRIORITY_ACTION.name },
];

export const calculateMaxBurnRateThreshold = (longWindow: Duration, slo?: SLOResponse) => {
  return slo
    ? Math.floor(toMinutes(toDuration(slo.timeWindow.duration)) / toMinutes(longWindow))
    : Infinity;
};

function Window({
  slo,
  id,
  burnRateThreshold,
  maxBurnRateThreshold,
  longWindow,
  shortWindow,
  actionGroup,
  onChange,
  onDelete,
  errors,
  disableDelete,
}: WindowProps) {
  const onLongWindowDurationChange = (duration: Duration) => {
    const longWindowDurationInMinutes = toMinutes(duration);
    const shortWindowDurationValue = Math.floor(longWindowDurationInMinutes / 12);
    onChange({
      id,
      burnRateThreshold,
      maxBurnRateThreshold,
      longWindow: duration,
      shortWindow: { value: shortWindowDurationValue, unit: 'm' },
      actionGroup,
    });
  };

  const onBurnRateChange = (value: number) => {
    onChange({
      id,
      burnRateThreshold: value,
      maxBurnRateThreshold: calculateMaxBurnRateThreshold(longWindow, slo),
      longWindow,
      shortWindow,
      actionGroup,
    });
  };

  const onActionGroupChange = (event: React.SyntheticEvent<HTMLSelectElement>) => {
    onChange({
      id,
      burnRateThreshold,
      maxBurnRateThreshold,
      longWindow,
      shortWindow,
      actionGroup: event.currentTarget.value,
    });
  };

  const computeErrorBudgetExhaustionInHours = () => {
    if (slo && longWindow?.value > 0 && burnRateThreshold >= 1) {
      return numeral(
        longWindow.value /
          ((burnRateThreshold * toMinutes(longWindow)) /
            toMinutes(toDuration(slo.timeWindow.duration)))
      ).format('0a');
    }
    return 'N/A';
  };

  const allErrors = [...errors.longWindow, ...errors.burnRateThreshold];

  return (
    <>
      <EuiFlexGroup direction="row" alignItems="center">
        <EuiFlexItem>
          <LongWindowDuration
            initialDuration={longWindow}
            shortWindowDuration={shortWindow}
            onChange={onLongWindowDurationChange}
            errors={errors.longWindow}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <BurnRate
            initialBurnRate={burnRateThreshold}
            maxBurnRate={maxBurnRateThreshold}
            onChange={onBurnRateChange}
            errors={errors.burnRateThreshold}
            helpText={getErrorBudgetExhaustionText(computeErrorBudgetExhaustionInHours())}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.observability.slo.rules.actionGroupSelectorLabel', {
              defaultMessage: 'Action Group',
            })}
          >
            <EuiSelect
              data-test-subj="sloBurnRateActionGroupSelctor"
              options={ACTION_GROUP_OPTIONS}
              value={actionGroup}
              onChange={onActionGroupChange}
              aria-label={i18n.translate('xpack.observability.slo.rules.actionGroupSelectorLabel', {
                defaultMessage: 'Action Group',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiButtonIcon
            data-test-subj="sloBurnRateRuleDeleteWindowButton"
            iconType="trash"
            color="danger"
            style={{ marginBottom: '-1em' }}
            onClick={() => onDelete(id)}
            disabled={disableDelete}
            title={i18n.translate('xpack.observability.slo.rules.deleteWindowLabel', {
              defaultMessage: 'Delete window',
            })}
            aria-label={i18n.translate('xpack.observability.slo.rules.deleteWindowLabel', {
              defaultMessage: 'Delete window',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {allErrors.length > 0 && (
        <EuiText color="danger" size="xs">
          {allErrors.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </EuiText>
      )}
      <EuiText color="subdued" size="xs">
        <p>{getErrorBudgetExhaustionText(computeErrorBudgetExhaustionInHours())}</p>
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
}

const getErrorBudgetExhaustionText = (formattedHours: string) =>
  i18n.translate('xpack.observability.slo.rules.errorBudgetExhaustion.text', {
    defaultMessage: '{formatedHours} hours until error budget exhaustion.',
    values: {
      formatedHours: formattedHours,
    },
  });

export const createNewWindow = (
  slo?: SLOResponse,
  partialWindow: Partial<WindowSchema> = {}
): WindowSchema => {
  const longWindow = partialWindow.longWindow || { value: 1, unit: 'h' };
  return {
    id: v4(),
    burnRateThreshold: 1,
    maxBurnRateThreshold: calculateMaxBurnRateThreshold(longWindow, slo),
    longWindow,
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: ALERT_ACTION.id,
    ...partialWindow,
  };
};

interface WindowsProps {
  windows: WindowSchema[];
  onChange: (windows: WindowSchema[]) => void;
  slo?: SLOResponse;
  errors: WindowResult[];
  totalNumberOfWindows?: number;
}

export function Windows({ slo, windows, errors, onChange, totalNumberOfWindows }: WindowsProps) {
  const handleWindowChange = (windowDef: WindowSchema) => {
    onChange(windows.map((def) => (windowDef.id === def.id ? windowDef : def)));
  };

  const handleWindowDelete = (id: string) => {
    onChange(windows.length > 1 ? windows.filter((windowDef) => windowDef.id !== id) : windows);
  };

  const handleAddWindow = () => {
    onChange([...windows, createNewWindow()]);
  };

  return (
    <>
      {windows.map((windowDef, index) => {
        const windowErrors = errors[index] || {
          longWindow: new Array<string>(),
          burnRateThreshold: new Array<string>(),
        };
        return (
          <Window
            {...windowDef}
            key={windowDef.id}
            slo={slo}
            errors={windowErrors}
            onChange={handleWindowChange}
            onDelete={handleWindowDelete}
            disableDelete={windows.length === 1}
          />
        );
      })}
      <EuiButtonEmpty
        data-test-subj="sloBurnRateRuleAddWindowButton"
        color={'primary'}
        size="xs"
        iconType={'plusInCircleFilled'}
        onClick={handleAddWindow}
        isDisabled={windows.length === (totalNumberOfWindows || 4)}
        aria-label={i18n.translate('xpack.observability.slo.rules.addWindowAriaLabel', {
          defaultMessage: 'Add window',
        })}
      >
        <FormattedMessage
          id="xpack.observability.slo.rules.addWIndowLabel"
          defaultMessage="Add window"
        />
      </EuiButtonEmpty>
    </>
  );
}
