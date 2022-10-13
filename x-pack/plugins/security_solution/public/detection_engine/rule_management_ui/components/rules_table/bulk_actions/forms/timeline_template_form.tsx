/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut } from '@elastic/eui';

import type { FormSchema } from '../../../../../../shared_imports';
import { useForm, UseField } from '../../../../../../shared_imports';
import { PickTimeline } from '../../../../../../detections/components/rules/pick_timeline';
import type { BulkActionEditPayload } from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { BulkActionEditType } from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { bulkApplyTimelineTemplate as i18n } from '../translations';

export interface TimelineTemplateFormData {
  timeline: {
    id: string | null;
    title: string;
  };
}

const formSchema: FormSchema<TimelineTemplateFormData> = {
  timeline: {
    label: i18n.TEMPLATE_SELECTOR_LABEL,
    helpText: i18n.TEMPLATE_SELECTOR_HELP_TEXT,
  },
};

const defaultFormData: TimelineTemplateFormData = {
  timeline: {
    id: null,
    title: i18n.TEMPLATE_SELECTOR_DEFAULT_VALUE,
  },
};

interface TimelineTemplateFormProps {
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const TimelineTemplateFormComponent = (props: TimelineTemplateFormProps) => {
  const { rulesCount, onClose, onConfirm } = props;

  const { form } = useForm({
    schema: formSchema,
    defaultValue: defaultFormData,
  });

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const timelineId = data.timeline.id || '';
    const timelineTitle = timelineId ? data.timeline.title : '';

    onConfirm({
      type: BulkActionEditType.set_timeline,
      value: {
        timeline_id: timelineId,
        timeline_title: timelineTitle,
      },
    });
  }, [form, onConfirm]);

  const warningCallout = (
    <EuiCallOut color="warning" data-test-subj="bulkEditRulesTimelineTemplateWarning">
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
      {/* Timeline template selector */}
      <UseField
        path="timeline"
        component={PickTimeline}
        componentProps={{
          idAria: 'bulkEditRulesTimelineTemplateSelector',
          dataTestSubj: 'bulkEditRulesTimelineTemplateSelector',
          placeholder: i18n.TEMPLATE_SELECTOR_PLACEHOLDER,
        }}
      />
    </BulkEditFormWrapper>
  );
};

export const TimelineTemplateForm = React.memo(TimelineTemplateFormComponent);
TimelineTemplateForm.displayName = 'TimelineTemplateForm';
