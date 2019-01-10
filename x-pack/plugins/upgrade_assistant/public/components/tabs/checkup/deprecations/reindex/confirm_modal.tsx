/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { EuiFieldText, EuiSpacer, EuiText } from '@elastic/eui';
import { ReindexWarning } from '../../../../../../common/types';
import { ReindexWarningSummary } from './warnings';

interface ReindexConfirmModalState {
  confirmInputValue: string;
}

interface ReindexConfirmModalProps {
  closeModal: () => void;
  indexName: string;
  startReindex: () => void;
  warnings: ReindexWarning[];
}

export class ReindexConfirmModal extends React.Component<
  ReindexConfirmModalProps,
  ReindexConfirmModalState
> {
  constructor(props: ReindexConfirmModalProps) {
    super(props);
    this.state = {
      confirmInputValue: '',
    };
  }

  public render() {
    const { closeModal, indexName, startReindex, warnings } = this.props;
    const { confirmInputValue } = this.state;

    return (
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Are you sure you want to reindex?</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <ReindexWarningSummary warnings={warnings} />
          <EuiSpacer />
          <EuiText>
            <strong>Type the index name below if you accept these changes.</strong>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFieldText
            placeholder={indexName}
            fullWidth
            value={confirmInputValue}
            onChange={this.onConfirmInputChange}
            aria-label="Index name confirmation"
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

          <EuiButton
            onClick={startReindex}
            fill
            color="warning"
            disabled={confirmInputValue !== indexName}
          >
            Reindex
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  private onConfirmInputChange = (e: any) => {
    this.setState({ confirmInputValue: e.target.value });
  };
}
