/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiCodeEditor,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiSelect,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { IndexActionParams, EsIndexActionConnector } from './types';
import { getTimeFieldOptions } from '../../../common/lib/get_time_options';
import {
  firstFieldOption,
  getFields,
  getIndexOptions,
  getIndexPatterns,
} from '../../../common/index_controls';

export function getActionType(): ActionTypeModel {
  return {
    id: '.index',
    iconClass: 'indexOpen',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.selectMessageText',
      {
        defaultMessage: 'Index data into Elasticsearch.',
      }
    ),
    validateConnector: (action: EsIndexActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        index: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.index) {
        errors.index.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.error.requiredIndexText',
            {
              defaultMessage: 'Index is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: IndexActionConnectorFields,
    actionParamsFields: IndexParamsFields,
    validateParams: (): ValidationResult => {
      return { errors: {} };
    },
  };
}

const IndexActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EsIndexActionConnector
>> = ({ action, editActionConfig, errors, http }) => {
  const { index, refresh, executionTimeField } = action.config;
  const [hasTimeFieldCheckbox, setTimeFieldCheckboxState] = useState<boolean>(
    executionTimeField !== undefined
  );

  const [indexPatterns, setIndexPatterns] = useState([]);
  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
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
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.howToBroadenSearchQueryDescription"
            defaultMessage="Use * to broaden your query."
          />
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
            editActionConfig('index', selected[0].value);
            const indices = selected.map(s => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFieldOptions([]);
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            const timeFields = getTimeFieldOptions(currentEsFields as any);

            setTimeFieldOptions([firstFieldOption, ...timeFields]);
          }}
          onSearchChange={async search => {
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
        onChange={e => {
          editActionConfig('refresh', e.target.checked);
        }}
        label={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshLabel"
              defaultMessage="Refresh"
            />{' '}
            <EuiIconTip
              position="right"
              type="questionInCircle"
              content={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshTooltip',
                {
                  defaultMessage: 'This checkbox set refresh index value.',
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
        }}
        label={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.defineTimeFieldLabel"
              defaultMessage="Define time field"
            />
            <EuiIconTip
              position="right"
              type="questionInCircle"
              content={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.definedateFieldTooltip',
                {
                  defaultMessage:
                    'This is checkbox allows to define execution time field for index.',
                }
              )}
            />
          </>
        }
      />
      <EuiSpacer size="m" />
      {hasTimeFieldCheckbox ? (
        <>
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
              value={executionTimeField}
              onChange={e => {
                editActionConfig('executionTimeField', e.target.value);
              }}
              onBlur={() => {
                if (executionTimeField === undefined) {
                  editActionConfig('executionTimeField', '');
                }
              }}
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};

const IndexParamsFields: React.FunctionComponent<ActionParamsProps<IndexActionParams>> = ({
  actionParams,
  index,
  editAction,
}) => {
  const { documents } = actionParams;

  function onDocumentsChange(updatedDocuments: string) {
    try {
      const documentsJSON = JSON.parse(updatedDocuments);
      editAction('documents', [documentsJSON], index);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.documentsFieldLabel',
          {
            defaultMessage: 'Document to index',
          }
        )}
      >
        <EuiCodeEditor
          aria-label={''}
          mode={'json'}
          theme="github"
          data-test-subj="actionIndexDoc"
          value={JSON.stringify(documents && documents.length > 0 ? documents[0] : {}, null, 2)}
          onChange={onDocumentsChange}
          width="100%"
          height="auto"
          minLines={6}
          maxLines={30}
          isReadOnly={false}
          setOptions={{
            showLineNumbers: true,
            tabSize: 2,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={true}
        />
      </EuiFormRow>
    </Fragment>
  );
};
