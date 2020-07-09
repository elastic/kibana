/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiSelect,
  EuiTitle,
  EuiIconTip,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EsIndexActionConnector } from '.././types';
import { getTimeFieldOptions } from '../../../../common/lib/get_time_options';
import {
  firstFieldOption,
  getFields,
  getIndexOptions,
  getIndexPatterns,
} from '../../../../common/index_controls';

const IndexActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EsIndexActionConnector
>> = ({ action, editActionConfig, errors, http, docLinks }) => {
  const { index, refresh, executionTimeField } = action.config;
  const [hasTimeFieldCheckbox, setTimeFieldCheckboxState] = useState<boolean>(
    executionTimeField != null
  );

  const [indexPatterns, setIndexPatterns] = useState([]);
  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState<Array<{ value: string; text: string }>>([
    firstFieldOption,
  ]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  useEffect(() => {
    const indexPatternsFunction = async () => {
      setIndexPatterns(await getIndexPatterns());
      if (index) {
        const currentEsFields = await getFields(http!, [index]);
        const timeFields = getTimeFieldOptions(currentEsFields as any);
        setTimeFieldOptions([firstFieldOption, ...timeFields]);
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
      <EuiFormRow
        id="indexConnectorSelectSearchBox"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indicesToQueryLabel"
            defaultMessage="Index"
          />
        }
        isInvalid={errors.index.length > 0 && index !== undefined}
        error={errors.index}
        helpText={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.howToBroadenSearchQueryDescription"
              defaultMessage="Use * to broaden your query."
            />
            <EuiSpacer size="s" />
            <EuiLink
              href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/index-action-type.html`}
              target="_blank"
            >
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
          isLoading={isIndiciesLoading}
          isInvalid={errors.index.length > 0 && index !== undefined}
          noSuggestions={!indexOptions.length}
          options={indexOptions}
          data-test-subj="connectorIndexesComboBox"
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
          onChange={async (selected: EuiComboBoxOptionOption[]) => {
            editActionConfig('index', selected.length > 0 ? selected[0].value : '');
            const indices = selected.map((s) => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFieldOptions([]);
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            const timeFields = getTimeFieldOptions(currentEsFields as any);

            setTimeFieldOptions([firstFieldOption, ...timeFields]);
          }}
          onSearchChange={async (search) => {
            setIsIndiciesLoading(true);
            setIndexOptions(await getIndexOptions(http!, search, indexPatterns));
            setIsIndiciesLoading(false);
          }}
          onBlur={() => {
            if (!index) {
              editActionConfig('index', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="indexRefreshCheckbox"
        checked={refresh || false}
        onChange={(e) => {
          editActionConfig('refresh', e.target.checked);
        }}
        label={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshLabel"
              defaultMessage="Refresh index"
            />{' '}
            <EuiIconTip
              position="right"
              type="questionInCircle"
              content={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshTooltip',
                {
                  defaultMessage:
                    'Refresh the affected shards to make this operation visible to search.',
                }
              )}
            />
          </>
        }
      />
      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="hasTimeFieldCheckbox"
        checked={hasTimeFieldCheckbox || false}
        onChange={() => {
          setTimeFieldCheckboxState(!hasTimeFieldCheckbox);
          // if changing from checked to not checked (hasTimeField === true),
          // set time field to null
          if (hasTimeFieldCheckbox) {
            editActionConfig('executionTimeField', null);
          }
        }}
        label={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.defineTimeFieldLabel"
              defaultMessage="Define time field for each document"
            />
            <EuiIconTip
              position="right"
              type="questionInCircle"
              content={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.definedateFieldTooltip',
                {
                  defaultMessage: `Automatically add a time field to each document when it's indexed.`,
                }
              )}
            />
          </>
        }
      />
      {hasTimeFieldCheckbox ? (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            id="executionTimeField"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.executionTimeFieldLabel"
                defaultMessage="Time field"
              />
            }
          >
            <EuiSelect
              options={timeFieldOptions}
              fullWidth
              name="executionTimeField"
              data-test-subj="executionTimeFieldSelect"
              value={executionTimeField ?? ''}
              onChange={(e) => {
                editActionConfig('executionTimeField', nullableString(e.target.value));
              }}
              onBlur={() => {
                if (executionTimeField === undefined) {
                  editActionConfig('executionTimeField', null);
                }
              }}
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};

// if the string == null or is empty, return null, else return string
function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}

// eslint-disable-next-line import/no-default-export
export { IndexActionConnectorFields as default };
