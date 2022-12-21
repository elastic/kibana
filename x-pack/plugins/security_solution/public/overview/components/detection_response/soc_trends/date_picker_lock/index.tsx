/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { inputsActions, inputsSelectors } from '../../../../../common/store/inputs';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import * as i18n from './translations';

const SocTrendsDatePickerLockComponent = () => {
  const dispatch = useDispatch();
  const getGlobalInput = useMemo(() => inputsSelectors.globalSelector(), []);
  const isDatePickerLocked = useShallowEqualSelector((state) =>
    getGlobalInput(state).linkTo.includes(InputsModelId.socTrends)
  );

  const onToggleLock = useCallback(
    () => dispatch(inputsActions.toggleSocTrendsLinkTo()),
    [dispatch]
  );

  return (
    <EuiToolTip
      data-test-subj="socTrends-date-picker-lock-tooltip"
      position="top"
      content={
        isDatePickerLocked
          ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
          : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
      }
    >
      <EuiButtonIcon
        data-test-subj={`socTrends-date-picker-${isDatePickerLocked ? 'lock' : 'unlock'}-button`}
        color="primary"
        onClick={onToggleLock}
        iconType={isDatePickerLocked ? 'lock' : 'lockOpen'}
        aria-label={
          isDatePickerLocked
            ? i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA
            : i18n.LOCK_SYNC_MAIN_DATE_PICKER_ARIA
        }
      />
    </EuiToolTip>
  );
};

SocTrendsDatePickerLockComponent.displayName = 'SocTrendsDatePickerLockComponent';

export const SocTrendsDatePickerLock = React.memo(SocTrendsDatePickerLockComponent);
