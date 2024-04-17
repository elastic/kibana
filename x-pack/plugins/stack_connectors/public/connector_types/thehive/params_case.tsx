/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TextFieldWithMessageVariables, TextAreaWithMessageVariables, ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { severityOptions, tlpOptions } from './constants';
import * as translations from './translations';
import { ExecutorParams, ExecutorSubActionPushParams } from '@kbn/stack-connectors-plugin/common/thehive/types';
import {
  EuiFormRow,
  EuiSelect,
  EuiText,
  EuiComboBox,
} from '@elastic/eui';

export const TheHiveParamsCaseFields: React.FC<ActionParamsProps<ExecutorParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
}) => {
  const [severity, setSeverity] = useState(severityOptions[1].value);
  const [tlp, setTlp] = useState(tlpOptions[2].value);
  const [selectedOptions, setSelected] = useState<Array<{ label: string }>>([]);

  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams as ExecutorSubActionPushParams ??
      ({
        incident: {
          tlp: 2,
          severity: 2,
          tags: []
        },
        comments: [],
      } as unknown as ExecutorSubActionPushParams),
    [actionParams.subActionParams]
  );

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps =
        key !== 'comments'
          ? {
            incident: { ...incident, [key]: value },
            comments,
          }
          : { incident, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [comments, editAction, incident, index]
  );

  const editComment = useCallback(
    (key, value) => {
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
    },
    [editSubActionProperty]
  );

  const onCreateOption = (searchValue: string) => {
    setSelected([...selectedOptions, { label: searchValue }]);
    editSubActionProperty('tags', [...incident.tags ?? [], searchValue])
  };

  const onChange = (selectedOptions: Array<{ label: string }>) => {
    setSelected(selectedOptions);
    editSubActionProperty('tags', selectedOptions.map((option) => option.label));
  }

  return (
    <>
      <EuiFormRow
        data-test-subj="title-row"
        fullWidth
        error={errors['pushToServiceParam.incident.title']}
        isInvalid={
          errors['pushToServiceParam.incident.title'] !== undefined &&
          errors['pushToServiceParam.incident.title'].length > 0 &&
          incident.title !== undefined
        }
        label={translations.TITLE_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Required
          </EuiText>
        }
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          paramsProperty={'title'}
          inputTargetValue={incident.title ?? undefined}
          errors={errors['pushToServiceParam.incident.title'] as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="description-row"
        fullWidth
        error={errors['pushToServiceParam.incident.description']}
        isInvalid={
          errors['pushToServiceParam.incident.description'] !== undefined &&
          errors['pushToServiceParam.incident.description'].length > 0 &&
          incident.description !== undefined
        }
        label={translations.DESCRIPTION_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Required
          </EuiText>
        }
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          paramsProperty={'description'}
          inputTargetValue={incident.description ?? undefined}
          errors={errors['pushToServiceParam.incident.description'] as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.severity}
        label={translations.SEVERITY_LABEL}
      >
        <EuiSelect
          fullWidth
          data-test-subj="eventSeveritySelect"
          value={severity}
          options={severityOptions}
          onChange={(e) => {
            editSubActionProperty('severity', parseInt(e.target.value))
            setSeverity(parseInt(e.target.value));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.tlp}
        label={translations.TLP_LABEL}>
        <EuiSelect
          fullWidth
          value={tlp}
          data-test-subj="eventTlpSelect"
          options={tlpOptions}
          onChange={(e) => {
            editSubActionProperty('tlp', parseInt(e.target.value));
            setTlp(parseInt(e.target.value));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={translations.TAGS_LABEL}
      >
        <EuiComboBox
          data-test-subj="eventTags"
          fullWidth
          options={[]}
          placeholder="Tags"
          selectedOptions={selectedOptions}
          onCreateOption={onCreateOption}
          onChange={onChange}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        data-test-subj="comment"
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={translations.COMMENTS_LABEL}
      />
    </>
  )
}