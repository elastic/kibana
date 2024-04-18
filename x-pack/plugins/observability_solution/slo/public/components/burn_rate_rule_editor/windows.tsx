/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSelect,
  EuiFormRow,
  EuiText,
  EuiTitle,
  EuiSwitch,
} from '@elastic/eui';
import { CreateSLOInput, SLODefinitionResponse } from '@kbn/slo-schema';
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
import { BudgetConsumed } from './budget_consumed';

interface WindowProps extends WindowSchema {
  slo?: SLODefinitionResponse;
  onChange: (windowDef: WindowSchema) => void;
  onDelete: (id: string) => void;
  disableDelete: boolean;
  errors: WindowResult;
  budgetMode: boolean;
}

const ACTION_GROUP_OPTIONS = [
  { value: ALERT_ACTION.id, text: ALERT_ACTION.name },
  { value: HIGH_PRIORITY_ACTION.id, text: HIGH_PRIORITY_ACTION.name },
  { value: MEDIUM_PRIORITY_ACTION.id, text: MEDIUM_PRIORITY_ACTION.name },
  { value: LOW_PRIORITY_ACTION.id, text: LOW_PRIORITY_ACTION.name },
];

export const calculateMaxBurnRateThreshold = (
  longWindow: Duration,
  slo?: SLODefinitionResponse | CreateSLOInput
) => {
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
  budgetMode = true,
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

  const sloTimeWindowInHours = Math.round(
    toMinutes(toDuration(slo?.timeWindow.duration ?? '30d')) / 60
  );

  const computeBudgetConsumed = () => {
    if (slo && longWindow.value > 0 && burnRateThreshold > 0) {
      return (burnRateThreshold * longWindow.value) / sloTimeWindowInHours;
    }
    return 0;
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
        {!budgetMode && (
          <EuiFlexItem>
            <BurnRate
              initialBurnRate={burnRateThreshold}
              maxBurnRate={maxBurnRateThreshold}
              onChange={onBurnRateChange}
              errors={errors.burnRateThreshold}
            />
          </EuiFlexItem>
        )}
        {budgetMode && (
          <EuiFlexItem>
            <BudgetConsumed
              initialBurnRate={burnRateThreshold}
              onChange={onBurnRateChange}
              errors={errors.burnRateThreshold}
              sloTimeWindowInHours={sloTimeWindowInHours}
              longLookbackWindowInHours={longWindow.value}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.slo.rules.actionGroupSelectorLabel', {
              defaultMessage: 'Action Group',
            })}
          >
            <EuiSelect
              data-test-subj="sloBurnRateActionGroupSelctor"
              options={ACTION_GROUP_OPTIONS}
              value={actionGroup}
              onChange={onActionGroupChange}
              aria-label={i18n.translate('xpack.slo.rules.actionGroupSelectorLabel', {
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
            title={i18n.translate('xpack.slo.rules.deleteWindowLabel', {
              defaultMessage: 'Delete window',
            })}
            aria-label={i18n.translate('xpack.slo.rules.deleteWindowLabel', {
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
        <p>
          {getErrorBudgetExhaustionText(
            computeErrorBudgetExhaustionInHours(),
            computeBudgetConsumed(),
            burnRateThreshold,
            budgetMode
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
}

const getErrorBudgetExhaustionText = (
  formattedHours: string,
  budgetConsumed: number,
  burnRateThreshold: number,
  budgetMode = false
) =>
  budgetMode
    ? i18n.translate('xpack.slo.rules.errorBudgetExhaustion.budgetMode.text', {
        defaultMessage:
          '{formatedHours} hours until error budget exhaustion. The burn rate threshold is {burnRateThreshold}x.',
        values: {
          formatedHours: formattedHours,
          burnRateThreshold: numeral(burnRateThreshold).format('0[.0]'),
        },
      })
    : i18n.translate('xpack.slo.rules.errorBudgetExhaustion.burnRateMode.text', {
        defaultMessage:
          '{formatedHours} hours until error budget exhaustion. {budgetConsumed} budget consumed before first alert.',
        values: {
          formatedHours: formattedHours,
          budgetConsumed: numeral(budgetConsumed).format('0.00%'),
        },
      });
export const createNewWindow = (
  slo?: SLODefinitionResponse | CreateSLOInput,
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
  slo?: SLODefinitionResponse;
  errors: WindowResult[];
  totalNumberOfWindows?: number;
}

export function Windows({ slo, windows, errors, onChange, totalNumberOfWindows }: WindowsProps) {
  const [budgetMode, setBudgetMode] = useState<boolean>(true);
  const handleWindowChange = (windowDef: WindowSchema) => {
    onChange(windows.map((def) => (windowDef.id === def.id ? windowDef : def)));
  };

  const handleWindowDelete = (id: string) => {
    onChange(windows.length > 1 ? windows.filter((windowDef) => windowDef.id !== id) : windows);
  };

  const handleAddWindow = () => {
    onChange([...windows, createNewWindow()]);
  };

  const handleModeChange = () => {
    setBudgetMode((previous) => !previous);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.slo.burnRateRuleEditor.h5.defineMultipleBurnRateLabel', {
            defaultMessage: 'Define multiple burn rate windows',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
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
            budgetMode={budgetMode}
          />
        );
      })}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={0}>
          <EuiButtonEmpty
            data-test-subj="sloBurnRateRuleAddWindowButton"
            color={'primary'}
            size="s"
            iconType={'plusInCircleFilled'}
            onClick={handleAddWindow}
            isDisabled={windows.length === (totalNumberOfWindows || 4)}
            aria-label={i18n.translate('xpack.slo.rules.addWindowAriaLabel', {
              defaultMessage: 'Add window',
            })}
          >
            <FormattedMessage id="xpack.slo.slo.rules.addWIndowLabel" defaultMessage="Add window" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiSwitch
            compressed
            onChange={handleModeChange}
            checked={!budgetMode}
            label={i18n.translate('xpack.slo.rules.useBurnRateModeLabel', {
              defaultMessage: 'Burn rate mode',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}
