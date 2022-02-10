/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useRef, useState, useCallback } from 'react';
import { EuiConfirmModal, EuiSpacer, EuiText, EuiCallOut } from '@elastic/eui';

import { JsonEditor, OnJsonEditorUpdateHandler } from '../../../../../shared_imports';

import { Processor } from '../../../../../../common/types';

import { deserialize } from '../../deserialize';

export type OnDoneLoadJsonHandler = (json: {
  processors: Processor[];
  on_failure?: Processor[];
}) => void;

export interface Props {
  onDone: OnDoneLoadJsonHandler;
  children: (openModal: () => void) => React.ReactNode;
}

const i18nTexts = {
  modalTitle: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.modalTitle', {
    defaultMessage: 'Load JSON',
  }),
  buttons: {
    cancel: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.buttons.cancel', {
      defaultMessage: 'Cancel',
    }),
    confirm: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.buttons.confirm', {
      defaultMessage: 'Load and overwrite',
    }),
  },
  editor: {
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.editor', {
      defaultMessage: 'Pipeline object',
    }),
  },
  error: {
    title: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.error.title', {
      defaultMessage: 'Invalid pipeline',
    }),
    body: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.error.body', {
      defaultMessage: 'Please ensure the JSON is a valid pipeline object.',
    }),
  },
};

const defaultValue = {};
const defaultValueRaw = JSON.stringify(defaultValue, null, 2);

export const ModalProvider: FunctionComponent<Props> = ({ onDone, children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isValidJson, setIsValidJson] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const jsonContent = useRef<Parameters<OnJsonEditorUpdateHandler>['0']>({
    isValid: true,
    validate: () => true,
    data: {
      format: () => defaultValue,
      raw: defaultValueRaw,
    },
  });

  const onJsonUpdate: OnJsonEditorUpdateHandler = useCallback((jsonUpdateData) => {
    setIsValidJson(jsonUpdateData.validate());
    jsonContent.current = jsonUpdateData;
  }, []);

  return (
    <>
      {children(() => setIsModalVisible(true))}
      {isModalVisible ? (
        <EuiConfirmModal
          data-test-subj="loadJsonConfirmationModal"
          title={i18nTexts.modalTitle}
          onCancel={() => {
            setIsModalVisible(false);
          }}
          onConfirm={async () => {
            try {
              const json = jsonContent.current.data.format();
              const { processors, on_failure: onFailure } = json;
              // This function will throw if it cannot parse the pipeline object
              deserialize({ processors, onFailure });
              onDone(json as any);
              setIsModalVisible(false);
            } catch (e) {
              setError(e);
            }
          }}
          cancelButtonText={i18nTexts.buttons.cancel}
          confirmButtonDisabled={!isValidJson}
          confirmButtonText={i18nTexts.buttons.confirm}
          maxWidth={600}
        >
          <div className="application">
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.loadJsonModal.jsonEditorHelpText"
                defaultMessage="Provide a pipeline object. This will override the existing pipeline processors and on-failure processors."
              />
            </EuiText>

            <EuiSpacer size="m" />

            {error && (
              <>
                <EuiCallOut
                  data-test-subj="errorCallOut"
                  title={i18nTexts.error.title}
                  color="danger"
                  iconType="alert"
                >
                  {i18nTexts.error.body}
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}

            <JsonEditor
              label={i18nTexts.editor.label}
              onUpdate={onJsonUpdate}
              euiCodeEditorProps={{
                height: '300px',
              }}
            />
          </div>
        </EuiConfirmModal>
      ) : undefined}
    </>
  );
};
