/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { BulkActionEditPayload } from '../../../../../../../common/detection_engine/schemas/request';
import { BulkActionEditType } from '../../../../../../../common/detection_engine/schemas/request';
import { useForm, UseField } from '../../../../../../shared_imports';
import type { FormSchema } from '../../../../../../shared_imports';
import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { ScheduleItem } from '../../../../../../detections/components/rules/schedule_item_form';

import { bulkSetSchedule as i18n } from '../translations';

export interface ScheduleFormData {
  interval: string;
  lookback: string;
}

export const formSchema: FormSchema<ScheduleFormData> = {
  interval: {
    label: i18n.INTERVAL_LABEL,
    helpText: i18n.INTERVAL_HELP_TEXT,
  },
  lookback: {
    label: i18n.LOOKBACK_LABEL,
    helpText: i18n.LOOKBACK_HELP_TEXT,
  },
};

const defaultFormData: ScheduleFormData = {
  interval: '5m',
  lookback: '1m',
};

interface ScheduleFormComponentProps {
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

export const ScheduleForm = ({ rulesCount, onClose, onConfirm }: ScheduleFormComponentProps) => {
  const { form } = useForm({
    schema: formSchema,
    defaultValue: defaultFormData,
  });

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    onConfirm({
      type: BulkActionEditType.set_schedule,
      value: {
        interval: data.interval,
        lookback: data.lookback,
      },
    });
  }, [form, onConfirm]);

  const warningCallout = (
    <EuiCallOut color="warning" data-test-subj="bulkEditRulesSchedulesWarning">
      {i18n.warningCalloutMessage(rulesCount)}
    </EuiCallOut>
  );

  return (
    <BulkEditFormWrapper
      form={form}
      title={i18n.FORM_TITLE}
      banner={warningCallout}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <UseField
        path="interval"
        component={ScheduleItem}
        componentProps={{
          idAria: 'bulkEditRulesScheduleIntervalSelector',
          dataTestSubj: 'bulkEditRulesScheduleIntervalSelector',
          fullWidth: true,
          minimumValue: 1,
        }}
      />
      <UseField
        path="lookback"
        component={ScheduleItem}
        componentProps={{
          idAria: 'bulkEditRulesScheduleLookbackSelector',
          dataTestSubj: 'bulkEditRulesScheduleLookbackSelector',
          fullWidth: true,
          minimumValue: 1,
        }}
      />
    </BulkEditFormWrapper>
  );
};
