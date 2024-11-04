/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiToolTip, EuiSwitch, EuiFormRow, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RowRendererValues } from '../../../../common/api/timeline';
import type { State } from '../../../common/store';
import { setExcludedRowRendererIds } from '../../store/actions';
import { selectExcludedRowRendererIds } from '../../store/selectors';
import * as i18n from './translations';

interface RowRendererSwitchProps {
  timelineId: string;
}

export const RowRendererSwitch = React.memo(function RowRendererSwitch(
  props: RowRendererSwitchProps
) {
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'rowRendererSwitch' });

  const { timelineId } = props;

  const dispatch = useDispatch();

  const excludedRowRendererIds = useSelector((state: State) =>
    selectExcludedRowRendererIds(state, timelineId)
  );

  const isAnyRowRendererEnabled = useMemo(
    () => RowRendererValues.some((id) => !excludedRowRendererIds.includes(id)),
    [excludedRowRendererIds]
  );

  const handleDisableAll = useCallback(() => {
    dispatch(
      setExcludedRowRendererIds({
        id: timelineId,
        excludedRowRendererIds: RowRendererValues,
      })
    );
  }, [dispatch, timelineId]);

  const handleEnableAll = useCallback(() => {
    dispatch(setExcludedRowRendererIds({ id: timelineId, excludedRowRendererIds: [] }));
  }, [dispatch, timelineId]);

  const onChange = useCallback(
    (e: EuiSwitchEvent) => {
      if (e.target.checked) {
        handleEnableAll();
      } else {
        handleDisableAll();
      }
    },
    [handleDisableAll, handleEnableAll]
  );

  const rowRendererLabel = useMemo(
    () => <span id={toggleTextSwitchId}>{i18n.EVENT_RENDERERS_SWITCH}</span>,
    [toggleTextSwitchId]
  );

  return (
    <EuiToolTip position="top" content={i18n.EVENT_RENDERERS_SWITCH_WARNING}>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          data-test-subj="row-renderer-switch"
          label={rowRendererLabel}
          checked={isAnyRowRendererEnabled}
          onChange={onChange}
          compressed
        />
      </EuiFormRow>
    </EuiToolTip>
  );
});
