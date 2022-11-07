/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useTimelineContext } from '../timeline_context/use_timeline_context';

type InsertFields = 'comment' | 'description';

export const InsertTimeline = ({ fieldName }: { fieldName: InsertFields }) => {
  const { setFieldValue, getFormData } = useFormContext();
  const timelineHooks = useTimelineContext()?.hooks;
  const formData = getFormData();
  const onTimelineAttached = useCallback(
    (newValue: string) => setFieldValue(fieldName, newValue),
    [fieldName, setFieldValue]
  );
  timelineHooks?.useInsertTimeline(formData[fieldName] ?? '', onTimelineAttached);
  return null;
};
