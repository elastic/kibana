/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import { SearchTimelineSuperSelect } from '../../../../timelines/components/timeline/search_super_select';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

export interface FieldValueTimeline {
  id: string | null;
  title: string | null;
}

interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  placeholder?: string;
}

export const PickTimeline = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
  placeholder,
}: QueryBarDefineRuleProps) => {
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string | null>(null);

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  useEffect(() => {
    const { id, title } = field.value as FieldValueTimeline;
    if (timelineId !== id) {
      setTimelineId(id);
      setTimelineTitle(title);
    }
  }, [field.value, timelineId]);

  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null) => {
      if (id === null) {
        field.setValue({ id, title: null });
      } else if (timelineId !== id) {
        field.setValue({ id, title });
      }
    },
    [field, timelineId]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <SearchTimelineSuperSelect
        isDisabled={isDisabled}
        hideUntitled={true}
        timelineId={timelineId}
        timelineTitle={timelineTitle}
        onTimelineChange={handleOnTimelineChange}
        placeholder={placeholder}
      />
    </EuiFormRow>
  );
};
