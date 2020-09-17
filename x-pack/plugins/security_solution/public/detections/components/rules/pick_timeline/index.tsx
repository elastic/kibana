/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import { SearchTimelineSuperSelect } from '../../../../timelines/components/timeline/search_super_select';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';

export interface FieldValueTimeline {
  id: string | null;
  title: string | null;
}

interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
}

export const PickTimeline = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled = false,
}: QueryBarDefineRuleProps) => {
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string | null>(null);

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  useEffect(() => {
    const { id, title } = field.value as FieldValueTimeline;
    if (timelineTitle !== title && timelineId !== id) {
      setTimelineId(id);
      setTimelineTitle(title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null) => {
      if (id === null) {
        field.setValue({ id, title: null });
      } else if (timelineTitle !== title && timelineId !== id) {
        field.setValue({ id, title });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field]
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
      />
    </EuiFormRow>
  );
};
