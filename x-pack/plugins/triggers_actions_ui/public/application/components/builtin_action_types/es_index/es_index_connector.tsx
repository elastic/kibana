/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EsIndexActionConnector } from '.././types';
import { getTimeFieldOptions } from '../../../../common/lib/get_time_options';
import { firstFieldOption, getFields, getIndexOptions } from '../../../../common/index_controls';
import { useKibana } from '../../../../common/lib/kibana';

interface TimeFieldOptions {
  value: string;
  text: string;
}

const IndexActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<EsIndexActionConnector>
> = ({ action, editActionConfig, errors, readOnly }) => {
  const { http, docLinks } = useKibana().services;
  const { index, refresh, executionTimeField } = action.config;
  const [showTimeFieldCheckbox, setShowTimeFieldCheckboxState] = useState<boolean>(
    executionTimeField != null
  );
  const [hasTimeFieldCheckbox, setHasTimeFieldCheckboxState] = useState<boolean>(
    executionTimeField != null
  );

  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState<TimeFieldOptions[]>([]);
  const [areIndiciesLoading, setAreIndicesLoading] = useState<boolean>(false);

  const setTimeFields = (fields: TimeFieldOptions[]) => {
    if (fields.length > 0) {
      setShowTimeFieldCheckboxState(true);
      setTimeFieldOptions([firstFieldOption, ...fields]);
    } else {
      setHasTimeFieldCheckboxState(false);
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
  const isIndexInvalid: boolean =
    errors.index !== undefined && errors.index.length > 0 && index !== undefined;

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
        isInvalid={isIndexInvalid}
        error={errors.index}
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
          isInvalid={isIndexInvalid}
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
          onChange={async (selected: EuiComboBoxOptionOption[]) => {
            editActionConfig('index', selected.length > 0 ? selected[0].value : '');
            const indices = selected.map((s) => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFields([]);
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            setTimeFields(getTimeFieldOptions(currentEsFields as any));
          }}
          onSearchChange={loadIndexOptions}
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
        disabled={readOnly}
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
      {showTimeFieldCheckbox && (
        <EuiSwitch
          data-test-subj="hasTimeFieldCheckbox"
          checked={hasTimeFieldCheckbox || false}
          disabled={readOnly}
          onChange={() => {
            setHasTimeFieldCheckboxState(!hasTimeFieldCheckbox);
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
                    defaultMessage: `Set this time field to the time the document was indexed.`,
                  }
                )}
              />
            </>
          }
        />
      )}
      {hasTimeFieldCheckbox && (
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
      )}
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
