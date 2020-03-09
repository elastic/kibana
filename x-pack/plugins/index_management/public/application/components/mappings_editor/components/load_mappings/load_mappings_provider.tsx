/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef } from 'react';
import { isPlainObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import { JsonEditor, OnJsonEditorUpdateHandler } from '../../shared_imports';
import { validateMappings, MappingsValidationError, VALID_MAPPINGS_PARAMETERS } from '../../lib';

const MAX_ERRORS_TO_DISPLAY = 1;

type OpenJsonModalFunc = () => void;

interface Props {
  onJson(json: { [key: string]: any }): void;
  children: (openModal: OpenJsonModalFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  json?: {
    unparsed: { [key: string]: any };
    parsed: { [key: string]: any };
  };
  errors?: MappingsValidationError[];
}

type ModalView = 'json' | 'validationResult';

const getTexts = (view: ModalView, totalErrors = 0) => ({
  modalTitle: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModalTitle', {
    defaultMessage: 'Load JSON',
  }),
  buttons: {
    confirm:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.loadButtonLabel', {
            defaultMessage: 'Load and overwrite',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.acceptWarningLabel', {
            defaultMessage: 'Continue loading',
          }),
    cancel:
      view === 'json'
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })
        : i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.goBackButtonLabel', {
            defaultMessage: 'Go back',
          }),
  },
  editor: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.loadJsonModal.jsonEditorLabel', {
      defaultMessage: 'Mappings object',
    }),
  },
  validationErrors: {
    title: (
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationErrorTitle"
        defaultMessage="{totalErrors} {totalErrors, plural, one {invalid option} other {invalid options}} detected in {mappings} object"
        values={{
          totalErrors,
          // NOTE: This doesn't need internationalization because it's part of the ES API.
          mappings: <code>mappings</code>,
        }}
      />
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.loadJsonModal.validationErrorDescription',
      {
        defaultMessage: 'If you continue loading the object, only valid options will be accepted.',
      }
    ),
  },
});

const getErrorMessage = (error: MappingsValidationError) => {
  switch (error.code) {
    case 'ERR_CONFIG': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.configurationMessage"
          defaultMessage="The {configName} configuration is invalid."
          values={{
            configName: <code>{error.configName}</code>,
          }}
        />
      );
    }
    case 'ERR_FIELD': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.fieldMessage"
          defaultMessage="The {fieldPath} field is invalid."
          values={{
            fieldPath: <code>{error.fieldPath}</code>,
          }}
        />
      );
    }
    case 'ERR_PARAMETER': {
      return (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.loadJsonModal.validationError.parameterMessage"
          defaultMessage="The {paramName} parameter on field {fieldPath} is invalid."
          values={{
            paramName: <code>{error.paramName}</code>,
            fieldPath: <code>{error.fieldPath}</code>,
          }}
        />
      );
    }
  }
};

const areAllObjectKeysValidParameters = (obj: { [key: string]: any }) =>
  Object.keys(obj).every(key => VALID_MAPPINGS_PARAMETERS.includes(key));

export const LoadMappingsProvider = ({ onJson, children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const [totalErrorsToDisplay, setTotalErrorsToDisplay] = useState<number>(MAX_ERRORS_TO_DISPLAY);
  const jsonContent = useRef<Parameters<OnJsonEditorUpdateHandler>['0'] | undefined>(undefined);
  const view: ModalView =
    state.json !== undefined && state.errors !== undefined ? 'validationResult' : 'json';
  const i18nTexts = getTexts(view, state.errors?.length);

  const onJsonUpdate: OnJsonEditorUpdateHandler = jsonUpdateData => {
    jsonContent.current = jsonUpdateData;
  };

  const openModal: OpenJsonModalFunc = () => {
    setState({ isModalOpen: true });
  };

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const getMappingsMetadata = (unparsed: {
    [key: string]: any;
  }): { customType?: string; isMultiTypeMappings: boolean } => {
    let hasCustomType = false;
    let isMultiTypeMappings = false;
    let customType: string | undefined;

    /**
     * We need to check if there are single or multi-types mappings declared, for that we will check for the following:
     *
     * - Are **all** root level keys valid parameter for the mappings definition. If not, and all keys are plain object, we assume we have multi-type mappings
     * - If there are more than two types, return "as is" as the UI does not support more than 1 type and will display a warning callout
     * - If there is only 1 type, validate the mappings definition and return it wrapped inside the the custom type
     */
    const areAllKeysValid = areAllObjectKeysValidParameters(unparsed);
    const areAllValuesPlainObjects = Object.values(unparsed).every(isPlainObject);
    const areAllValuesObjKeysValidParameterName =
      areAllValuesPlainObjects && Object.values(unparsed).every(areAllObjectKeysValidParameters);

    if (!areAllKeysValid && areAllValuesPlainObjects) {
      hasCustomType = true;
      isMultiTypeMappings = Object.keys(unparsed).length > 1;
    }
    // If all root level keys are *valid* parameters BUT they are all plain objects which *also* have ALL valid mappings config parameter
    // we can assume that they are custom types whose name matches a mappings configuration parameter.
    // This is to handle the case where a custom type would be for example "dynamic" which is a mappings configuration parameter.
    else if (areAllKeysValid && areAllValuesPlainObjects && areAllValuesObjKeysValidParameterName) {
      hasCustomType = true;
      isMultiTypeMappings = Object.keys(unparsed).length > 1;
    }

    if (hasCustomType && !isMultiTypeMappings) {
      customType = Object.keys(unparsed)[0];
    }

    return { isMultiTypeMappings, customType };
  };

  const loadJson = () => {
    if (jsonContent.current === undefined) {
      // No changes have been made in the JSON, this is probably a "reset()" for the user
      onJson({});
      closeModal();
      return;
    }

    const isValidJson = jsonContent.current.validate();

    if (isValidJson) {
      // Parse and validate the JSON to make sure it won't break the UI
      const unparsed = jsonContent.current.data.format();

      if (Object.keys(unparsed).length === 0) {
        // Empty object...exit early
        onJson(unparsed);
        closeModal();
        return;
      }

      let mappingsToValidate = unparsed;
      const { isMultiTypeMappings, customType } = getMappingsMetadata(unparsed);

      if (isMultiTypeMappings) {
        // Exit early, the UI will show a warning
        onJson(unparsed);
        closeModal();
        return;
      }

      // Custom type can't be "properties", ES will not treat it as such
      // as it is reserved for fields definition
      if (customType !== undefined && customType !== 'properties') {
        mappingsToValidate = unparsed[customType];
      }

      const { value: parsed, errors } = validateMappings(mappingsToValidate);

      // Wrap the mappings definition with custom type if one was provided.
      const parsedWithType = customType !== undefined ? { [customType]: parsed } : parsed;

      if (errors) {
        setState({ isModalOpen: true, json: { unparsed, parsed: parsedWithType }, errors });
        return;
      }

      onJson(parsedWithType);
      closeModal();
    }
  };

  const onConfirm = () => {
    if (view === 'json') {
      loadJson();
    } else {
      // We have some JSON and we agree on the error
      onJson(state.json!.parsed);
      closeModal();
    }
  };

  const onCancel = () => {
    if (view === 'json') {
      // Cancel...
      closeModal();
    } else {
      // Go back to the JSON editor to correct the errors.
      setState({ isModalOpen: true, json: state.json });
    }
  };

  const renderErrorsFilterButton = () => {
    const showingAllErrors = totalErrorsToDisplay > MAX_ERRORS_TO_DISPLAY;
    return (
      <EuiButtonEmpty
        onClick={() =>
          setTotalErrorsToDisplay(showingAllErrors ? MAX_ERRORS_TO_DISPLAY : state.errors!.length)
        }
        iconType={showingAllErrors ? 'arrowUp' : 'arrowDown'}
      >
        {showingAllErrors
          ? i18n.translate('xpack.idxMgmt.mappingsEditor.hideErrorsButtonLabel', {
              defaultMessage: 'Hide errors',
            })
          : i18n.translate('xpack.idxMgmt.mappingsEditor.showAllErrorsButtonLabel', {
              defaultMessage: 'Show {numErrors} more errors',
              values: {
                numErrors: state.errors!.length - MAX_ERRORS_TO_DISPLAY,
              },
            })}
      </EuiButtonEmpty>
    );
  };

  return (
    <>
      {children(openModal)}

      {state.isModalOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18nTexts.modalTitle}
            onCancel={onCancel}
            onConfirm={onConfirm}
            cancelButtonText={i18nTexts.buttons.cancel}
            confirmButtonText={i18nTexts.buttons.confirm}
            maxWidth={600}
          >
            {view === 'json' ? (
              // The CSS override for the EuiCodeEditor requires a parent .application css class
              <div className="application">
                <EuiText color="subdued">
                  <FormattedMessage
                    id="xpack.idxMgmt.mappingsEditor.loadJsonModal.jsonEditorHelpText"
                    defaultMessage="Provide a mappings object, for example, the object assigned to an index {mappings} property. This will overwrite existing mappings, dynamic templates, and options."
                    values={{
                      mappings: <code>mappings</code>,
                    }}
                  />
                </EuiText>

                <EuiSpacer size="m" />

                <JsonEditor
                  label={i18nTexts.editor.label}
                  onUpdate={onJsonUpdate}
                  defaultValue={state.json?.unparsed}
                  euiCodeEditorProps={{
                    height: '450px',
                  }}
                />
              </div>
            ) : (
              <>
                <EuiCallOut
                  title={i18nTexts.validationErrors.title}
                  iconType="alert"
                  color="warning"
                >
                  <EuiText>
                    <p>{i18nTexts.validationErrors.description}</p>
                  </EuiText>
                  <EuiSpacer />
                  <ol>
                    {state.errors!.slice(0, totalErrorsToDisplay).map((error, i) => (
                      <li key={i}>{getErrorMessage(error)}</li>
                    ))}
                  </ol>
                  {state.errors!.length > MAX_ERRORS_TO_DISPLAY && renderErrorsFilterButton()}
                </EuiCallOut>
              </>
            )}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
