/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { inputsActions, inputsSelectors } from '../../../../common/store/inputs';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import * as i18n from './translations';

const TimelineDatePickerLockComponent = () => {
  const dispatch = useDispatch();
  const getGlobalInput = useMemo(() => inputsSelectors.globalSelector(), []);
  const isDatePickerLocked = useShallowEqualSelector((state) =>
    getGlobalInput(state).linkTo.includes('timeline')
  );

  const onToggleLock = useCallback(
    () => dispatch(inputsActions.toggleTimelineLinkTo({ linkToId: 'timeline' })),
    [dispatch]
  );

  return (
    <EuiToolTip
      data-test-subj="timeline-date-picker-lock-tooltip"
      position="top"
      content={
        isDatePickerLocked
          ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
          : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
      }
    >
      <EuiButtonIcon
        data-test-subj={`timeline-date-picker-${isDatePickerLocked ? 'lock' : 'unlock'}-button`}
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

TimelineDatePickerLockComponent.displayName = 'TimelineDatePickerLockComponent';

export const TimelineDatePickerLock = React.memo(TimelineDatePickerLockComponent);
