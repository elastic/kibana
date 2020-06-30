/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButton } from '@elastic/eui';

import { ModalProvider, OnDoneLoadJsonHandler } from './modal_provider';

interface Props {
  onDone: OnDoneLoadJsonHandler;
}

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.buttonLabel', {
    defaultMessage: 'Load JSON',
  }),
};

export const LoadFromJsonButton: FunctionComponent<Props> = ({ onDone }) => {
  return (
    <ModalProvider onDone={onDone}>
      {(openModal) => {
        return (
          <EuiButton size="s" onClick={openModal}>
            {i18nTexts.buttonLabel}
          </EuiButton>
        );
      }}
    </ModalProvider>
  );
};
