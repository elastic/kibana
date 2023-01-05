/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useParams } from 'react-router-dom';

import { OsqueryInvestigationGuidePanel } from './osquery/osquery_investigation_guide_panel';
import { useRule } from '../rule_management/logic';
import { ResponseActionTypeForm } from './response_action_type_form';
import type { ArrayItem } from '../../shared_imports';
import { UseField, useFormContext, useFormData } from '../../shared_imports';
import { getResponseActionsFromNote, getOsqueryQueriesFromNote } from './utils';

interface ResponseActionsListProps {
  items: ArrayItem[];
  removeItem: (id: number) => void;
}

const GhostFormField = () => <></>;

export const ResponseActionsList = React.memo<ResponseActionsListProps>(({ items, removeItem }) => {
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const { data: rule } = useRule(ruleId);

  const osqueryNoteQueries = useMemo(
    () => (rule?.note ? getOsqueryQueriesFromNote(rule.note) : []),
    [rule?.note]
  );

  const context = useFormContext();
  const [formData] = useFormData();

  const handleInvestigationGuideClick = useCallback(() => {
    const values = getResponseActionsFromNote(osqueryNoteQueries, formData.responseActions);
    context.updateFieldValues(values);
  }, [context, formData?.responseActions, osqueryNoteQueries]);

  return (
    <div data-test-subj={'response-actions-list'}>
      {items.map((actionItem, index) => {
        return (
          <div key={actionItem.id} data-test-subj={`response-actions-list-item-${index}`}>
            <EuiSpacer size="m" />
            <ResponseActionTypeForm item={actionItem} onDeleteAction={removeItem} />

            <UseField path={`${actionItem.path}.actionTypeId`} component={GhostFormField} />
          </div>
        );
      })}
      <EuiSpacer size="m" />
      {osqueryNoteQueries.length ? (
        <OsqueryInvestigationGuidePanel onClick={handleInvestigationGuideClick} />
      ) : null}
    </div>
  );
});

ResponseActionsList.displayName = 'ResponseActionsList';
