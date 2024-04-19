/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  TextFieldWithMessageVariables,
  ActionParamsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, EuiText, EuiComboBox } from '@elastic/eui';
import { ExecutorParams, ExecutorSubActionCreateAlertParams } from '../../../common/thehive/types';
import { severityOptions, tlpOptions } from './constants';
import * as translations from './translations';

export const TheHiveParamsAlertFields: React.FC<ActionParamsProps<ExecutorParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
}) => {
  const [severity, setSeverity] = useState(severityOptions[1].value);
  const [tlp, setTlp] = useState(tlpOptions[2].value);
  const [selectedOptions, setSelected] = useState<Array<{ label: string }>>([]);

  const alert = useMemo(
    () =>
      (actionParams.subActionParams as ExecutorSubActionCreateAlertParams) ??
      ({
        tlp: 2,
        severity: 2,
        tags: [],
      } as unknown as ExecutorSubActionCreateAlertParams),
    [actionParams.subActionParams]
  );

  const onCreateOption = (searchValue: string) => {
    setSelected([...selectedOptions, { label: searchValue }]);
    editAction('subActionParams', { ...alert, tags: [...(alert.tags ?? []), searchValue] }, index);
  };

  const onChange = (selectedOptions: Array<{ label: string }>) => {
    setSelected(selectedOptions);
    editAction(
      'subActionParams',
      { ...alert, tags: selectedOptions.map((option) => option.label) },
      index
    );
  };

  return (
    <>
      <EuiFormRow
        data-test-subj="alert-title-row"
        fullWidth
        error={errors['createAlertParam.title']}
        isInvalid={
          errors['createAlertParam.title'] !== undefined &&
          errors['createAlertParam.title'].length > 0 &&
          alert.title !== undefined
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
          editAction={(key, value) => {
            editAction('subActionParams', { ...alert, [key]: value }, index);
          }}
          paramsProperty={'title'}
          inputTargetValue={alert.title ?? undefined}
          errors={errors['createAlertParam.title'] as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="alert-description-row"
        fullWidth
        error={errors['createAlertParam.description']}
        isInvalid={
          errors['createAlertParam.description'] !== undefined &&
          errors['createAlertParam.description'].length > 0 &&
          alert.description !== undefined
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
          editAction={(key, value) => {
            editAction('subActionParams', { ...alert, [key]: value }, index);
          }}
          paramsProperty={'description'}
          inputTargetValue={alert.description ?? undefined}
          errors={errors['createAlertParam.description'] as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="alert-type-row"
        fullWidth
        error={errors['createAlertParam.type']}
        isInvalid={
          errors['createAlertParam.type'] !== undefined &&
          errors['createAlertParam.type'].length > 0 &&
          alert.type !== undefined
        }
        label={translations.TYPE_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Required
          </EuiText>
        }
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={(key, value) => {
            editAction('subActionParams', { ...alert, [key]: value }, index);
          }}
          paramsProperty={'type'}
          inputTargetValue={alert.type ?? undefined}
          errors={(errors['createAlertParam.type'] ?? []) as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="alert-source-row"
        fullWidth
        error={errors['createAlertParam.source']}
        isInvalid={
          errors['createAlertParam.source'] !== undefined &&
          errors['createAlertParam.source'].length > 0 &&
          alert.source !== undefined
        }
        label={translations.SOURCE_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Required
          </EuiText>
        }
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={(key, value) => {
            editAction('subActionParams', { ...alert, [key]: value }, index);
          }}
          paramsProperty={'source'}
          inputTargetValue={alert.source ?? undefined}
          errors={(errors['createAlertParam.source'] ?? []) as string[]}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="alert-sourceRef-row"
        fullWidth
        error={errors['createAlertParam.sourceRef']}
        isInvalid={
          errors['createAlertParam.sourceRef'] !== undefined &&
          errors['createAlertParam.sourceRef'].length > 0 &&
          alert.sourceRef !== undefined
        }
        label={translations.SOURCE_REF_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Required
          </EuiText>
        }
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={(key, value) => {
            editAction('subActionParams', { ...alert, [key]: value }, index);
          }}
          messageVariables={messageVariables}
          paramsProperty={'sourceRef'}
          inputTargetValue={alert.sourceRef ?? undefined}
          errors={(errors['createAlertParam.sourceRef'] ?? []) as string[]}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={translations.SEVERITY_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="alert-eventSeveritySelect"
          value={severity}
          options={severityOptions}
          onChange={(e) => {
            editAction('subActionParams', { ...alert, severity: parseInt(e.target.value) }, index);
            setSeverity(parseInt(e.target.value));
          }}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={translations.TLP_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="alert-eventTlpSelect"
          value={tlp}
          options={tlpOptions}
          onChange={(e) => {
            editAction('subActionParams', { ...alert, tlp: parseInt(e.target.value) }, index);
            setTlp(parseInt(e.target.value));
          }}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={translations.TAGS_LABEL}>
        <EuiComboBox
          data-test-subj="alert-eventTags"
          fullWidth
          options={[]}
          placeholder="Tags"
          selectedOptions={selectedOptions}
          onCreateOption={onCreateOption}
          onChange={onChange}
        />
      </EuiFormRow>
    </>
  );
};
