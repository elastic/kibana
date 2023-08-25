/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiLink, EuiSpacer } from '@elastic/eui';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  FIELD_TYPES,
  UseField,
  TextField,
  SelectField,
  JsonEditorField,
} from '../../../../shared_imports';

import { IndicesSelector } from './fields/indices_selector';
import { documentationService } from '../../../services/documentation';
import { useCreatePolicyContext, DraftPolicy } from '../create_policy_context';

interface Props {
  onNext: () => void;
}

export const configurationFormSchema: FormSchema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyNameField', {
      defaultMessage: 'Policy name',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyNameRequiredError',
            {
              defaultMessage: 'A policy name value is required.',
            }
          )
        ),
      },
    ],
  },

  type: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyTypeLabel', {
      defaultMessage: 'Policy type',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.typeRequiredError', {
            defaultMessage: 'A policy type value is required.',
          })
        ),
      },
    ],
  },

  sourceIndices: {
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.sourceIndicesLabel', {
      defaultMessage: 'Source indices',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.idxMgmt.enrichPolicyCreate.configurationStep.sourceIndicesRequiredError',
            {
              defaultMessage: 'At least one source index is required.',
            }
          )
        ),
      },
    ],
  },

  query: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryLabel', {
      defaultMessage: 'Query (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryHelpText"
        defaultMessage="Defaults to: {code} query."
        values={{
          code: (
            <EuiLink external target="_blank" href={documentationService.getMatchAllQueryLink()}>
              <FormattedMessage
                id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.matchAllLink"
                defaultMessage="match_all"
              />
            </EuiLink>
          ),
        }}
      />
    ),
    validations: [
      {
        validator: fieldValidators.isJsonField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryInvalidError', {
            defaultMessage: 'The query is not valid JSON.',
          }),
          { allowEmptyString: true }
        ),
      },
    ],
  },
};

export const ConfigurationStep = ({ onNext }: Props) => {
  const { draft, updateDraft, updateCompletionState } = useCreatePolicyContext();

  const { form } = useForm({
    defaultValue: draft,
    schema: configurationFormSchema,
    id: 'configurationForm',
  });

  const onSubmit = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // Update form completion state
    updateCompletionState((prevCompletionState) => ({
      ...prevCompletionState,
      configurationStep: true,
    }));

    // Update draft state with the data of the form
    updateDraft((prevDraft: DraftPolicy) => ({
      ...prevDraft,
      ...data,
    }));

    // And then navigate to the next step
    onNext();
  };

  return (
    <Form form={form}>
      <UseField path="name" component={TextField} componentProps={{ fullWidth: false }} />

      <UseField
        path="type"
        component={SelectField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            options: [
              {
                value: 'match',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.matchOption',
                  { defaultMessage: 'Match' }
                ),
              },
              {
                value: 'geo_match',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.geoMatchOption',
                  { defaultMessage: 'Geo match' }
                ),
              },
              {
                value: 'range',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.rangeOption',
                  { defaultMessage: 'range' }
                ),
              },
            ],
          },
        }}
      />

      <UseField path="sourceIndices" component={IndicesSelector} />

      <UseField
        path="query"
        component={JsonEditorField}
        componentProps={{
          fullWidth: false,
          codeEditorProps: {
            height: '300px',
            allowFullScreen: true,
            'aria-label': i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.configurationStep.ariaLabelQuery',
              {
                defaultMessage: 'Query field data editor',
              }
            ),
            options: {
              lineNumbers: 'off',
              tabSize: 2,
              automaticLayout: true,
            },
          },
        }}
      />

      <EuiSpacer />

      <EuiButton
        fill
        color="primary"
        iconSide="right"
        iconType="arrowRight"
        disabled={form.isValid === false}
        onClick={onSubmit}
      >
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.nextButtonLabel"
          defaultMessage="Next"
        />
      </EuiButton>
    </Form>
  );
};
