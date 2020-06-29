/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useRef, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  JsonEditor,
  OnJsonEditorUpdateHandler,
} from '../../../../../../../../../src/plugins/es_ui_shared/public';

interface Props {
  onDone: (json: Record<string, any>) => void;
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
};

export const ModalProvider: FunctionComponent<Props> = ({ onDone, children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const jsonContent = useRef<Parameters<OnJsonEditorUpdateHandler>['0'] | undefined>();
  const onJsonUpdate: OnJsonEditorUpdateHandler = (jsonUpdateData) => {
    jsonContent.current = jsonUpdateData;
  };
  return (
    <>
      {children(() => setIsModalVisible(true))}
      {isModalVisible ? (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18nTexts.modalTitle}
            onCancel={() => {
              setIsModalVisible(false);
            }}
            onConfirm={() => {}}
            cancelButtonText={i18nTexts.buttons.cancel}
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

              <JsonEditor
                label={i18nTexts.editor.label}
                onUpdate={onJsonUpdate}
                euiCodeEditorProps={{
                  height: '450px',
                }}
              />
            </div>
          </EuiConfirmModal>
        </EuiOverlayMask>
      ) : undefined}
    </>
  );
};
