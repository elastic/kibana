/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiTitle,
  EuiIconTip,
  EuiLink,
} from '@elastic/eui';
import {
  FieldConfig,
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ToggleField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { DocLinksStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { getTimeFieldOptions } from '../../../../common/lib/get_time_options';
import { firstFieldOption, getFields, getIndexOptions } from '../../../../common/index_controls';
import { useKibana } from '../../../../common/lib/kibana';
import * as translations from './translations';

interface TimeFieldOptions {
  value: string;
  text: string;
}

const { indexPatternField, emptyField } = fieldValidators;

const getIndexConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: translations.INDEX_LABEL,
  helpText: (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.howToBroadenSearchQueryDescription"
        defaultMessage="Use * to broaden your query."
      />
      <EuiSpacer size="s" />
      <EuiLink href={docLinks.links.alerting.indexAction} target="_blank">
        <FormattedMessage
          id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.configureIndexHelpLabel"
          defaultMessage="Configuring index connector."
        />
      </EuiLink>
    </>
  ),
  validations: [
    {
      validator: emptyField(translations.INDEX_REQUIRED),
    },
    {
      validator: indexPatternField(i18n),
      type: VALIDATION_TYPES.ARRAY_ITEM,
    },
  ],
});

const IndexActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { http, docLinks } = useKibana().services;
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.executionTimeField', 'config.index', '__internal__.hasTimeFieldCheckbox'],
  });

  const { executionTimeField, index } = config ?? { executionTimeField: null, index: null };

  const [showTimeFieldCheckbox, setShowTimeFieldCheckboxState] = useState<boolean>(
    executionTimeField != null
  );

  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState<TimeFieldOptions[]>([]);
  const [areIndiciesLoading, setAreIndicesLoading] = useState<boolean>(false);

  const hasTimeFieldCheckbox = __internal__ != null ? __internal__.hasTimeFieldCheckbox : false;

  const setTimeFields = (fields: TimeFieldOptions[]) => {
    if (fields.length > 0) {
      setShowTimeFieldCheckboxState(true);
      setTimeFieldOptions([firstFieldOption, ...fields]);
    } else {
      setShowTimeFieldCheckboxState(false);
      setTimeFieldOptions([]);
    }
  };

  const loadIndexOptions = debounce(async (search: string) => {
    setAreIndicesLoading(true);
    setIndexOptions(await getIndexOptions(http!, search));
    setAreIndicesLoading(false);
  }, 250);

  useEffect(() => {
    const indexPatternsFunction = async () => {
      if (index) {
        const currentEsFields = await getFields(http!, [index]);
        setTimeFields(getTimeFieldOptions(currentEsFields as any));
      }
    };
    indexPatternsFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            defaultMessage="Write to index"
            id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.connectorSectionTitle"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="m" />
      <UseField path="config.index" config={getIndexConfig(docLinks)}>
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          const onComboChange = async (options: EuiComboBoxOptionOption[]) => {
            field.setValue(options.length > 0 ? options[0].value : '');
            const indices = options.map((s) => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFields([]);
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            setTimeFields(getTimeFieldOptions(currentEsFields as any));
          };

          return (
            <EuiFormRow
              id="indexConnectorSelectSearchBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indicesToQueryLabel"
                  defaultMessage="Index"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
              helpText={
                <>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.howToBroadenSearchQueryDescription"
                    defaultMessage="Use * to broaden your query."
                  />
                  <EuiSpacer size="s" />
                  <EuiLink href={docLinks.links.alerting.indexAction} target="_blank">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.configureIndexHelpLabel"
                      defaultMessage="Configuring index connector."
                    />
                  </EuiLink>
                </>
              }
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                async
                isLoading={areIndiciesLoading}
                isInvalid={isInvalid}
                noSuggestions={!indexOptions.length}
                options={indexOptions}
                data-test-subj="connectorIndexesComboBox"
                data-testid="connectorIndexesComboBox"
                selectedOptions={
                  index
                    ? [
                        {
                          value: index,
                          label: index,
                        },
                      ]
                    : []
                }
                isDisabled={readOnly}
                onChange={onComboChange}
                onSearchChange={loadIndexOptions}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="m" />
      <UseField
        path="config.refresh"
        component={ToggleField}
        defaultValue={false}
        componentProps={{
          euiFieldProps: {
            label: (
              <>
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshLabel"
                  defaultMessage="Refresh index"
                />{' '}
                <EuiIconTip
                  position="right"
                  type="questionInCircle"
                  content={translations.REFRESH_FIELD_TOGGLE_TOOLTIP}
                />
              </>
            ),
            disabled: readOnly,
            'data-test-subj': 'indexRefreshCheckbox',
          },
        }}
      />
      <EuiSpacer size="m" />
      <div style={{ display: showTimeFieldCheckbox ? 'block' : 'none' }}>
        <UseField
          path="__internal__.hasTimeFieldCheckbox"
          component={ToggleField}
          config={{ defaultValue: false }}
          componentProps={{
            euiFieldProps: {
              label: (
                <>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.defineTimeFieldLabel"
                    defaultMessage="Define time field for each document"
                  />
                  <EuiIconTip
                    position="right"
                    type="questionInCircle"
                    content={translations.SHOW_TIME_FIELD_TOGGLE_TOOLTIP}
                  />
                </>
              ),
              disabled: readOnly,
              'data-test-subj': 'hasTimeFieldCheckbox',
            },
          }}
        />
      </div>
      <div style={{ display: hasTimeFieldCheckbox ? 'block' : 'none' }}>
        <EuiSpacer size="m" />
        <UseField
          path="config.executionTimeField"
          component={SelectField}
          config={{
            label: translations.EXECUTION_TIME_LABEL,
            defaultValue: null,
            serializer: (fieldValue: string) => {
              return hasTimeFieldCheckbox ? fieldValue : null;
            },
          }}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'executionTimeFieldSelect',
              options: timeFieldOptions,
              fullWidth: true,
            },
          }}
        />
      </div>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexActionConnectorFields as default };
