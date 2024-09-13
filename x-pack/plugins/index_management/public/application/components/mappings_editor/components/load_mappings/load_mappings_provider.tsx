/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EuiCallOut, EuiText, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';

import { JsonEditor, OnJsonEditorUpdateHandler } from '../../shared_imports';
import { validateMappings, MappingsValidationError } from '../../lib';

const MAX_ERRORS_TO_DISPLAY = 1;

type OpenJsonModalFunc = () => void;

interface Props {
  onJson(json: { [key: string]: any }): void;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
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

export const LoadMappingsProvider = ({ onJson, esNodesPlugins, children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const [totalErrorsToDisplay, setTotalErrorsToDisplay] = useState<number>(MAX_ERRORS_TO_DISPLAY);
  const jsonContent = useRef<Parameters<OnJsonEditorUpdateHandler>['0'] | undefined>();
  const view: ModalView =
    state.json !== undefined && state.errors !== undefined ? 'validationResult' : 'json';
  const i18nTexts = getTexts(view, state.errors?.length);

  const onJsonUpdate: OnJsonEditorUpdateHandler = useCallback((jsonUpdateData) => {
    jsonContent.current = jsonUpdateData;
  }, []);

  const openModal: OpenJsonModalFunc = () => {
    setState({ isModalOpen: true });
  };

  const closeModal = () => {
    setState({ isModalOpen: false });
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
      const { value: parsed, errors } = validateMappings(unparsed, esNodesPlugins);

      if (errors) {
        setState({ isModalOpen: true, json: { unparsed, parsed }, errors });
        return;
      }

      onJson(parsed);
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
        <EuiConfirmModal
          title={i18nTexts.modalTitle}
          onCancel={onCancel}
          onConfirm={onConfirm}
          cancelButtonText={i18nTexts.buttons.cancel}
          confirmButtonText={i18nTexts.buttons.confirm}
          maxWidth={600}
        >
          {view === 'json' ? (
            <>
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
                codeEditorProps={{
                  height: '450px',
                }}
              />
            </>
          ) : (
            <>
              <EuiCallOut
                title={i18nTexts.validationErrors.title}
                iconType="warning"
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
      )}
    </>
  );
};
