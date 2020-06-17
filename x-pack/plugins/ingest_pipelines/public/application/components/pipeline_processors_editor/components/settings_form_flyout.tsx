/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import React, { FunctionComponent, memo, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { OnFormUpdateArg } from '../../../../shared_imports';

import { ProcessorInternal } from '../types';

import { ProcessorSettingsForm, ProcessorSettingsFromOnSubmitArg } from '.';

export type OnSubmitHandler = (processor: ProcessorSettingsFromOnSubmitArg) => void;

export interface Props {
  processor: ProcessorInternal | undefined;
  onFormUpdate: (form: OnFormUpdateArg<any>) => void;
  onSubmit: OnSubmitHandler;
  isOnFailureProcessor: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const SettingsFormFlyout: FunctionComponent<Props> = memo(
  ({ onClose, processor, onSubmit, onFormUpdate, onOpen, isOnFailureProcessor }) => {
    useEffect(
      () => {
        onOpen();
      },
      [] /* eslint-disable-line react-hooks/exhaustive-deps */
    );
    const flyoutTitleContent = isOnFailureProcessor ? (
      <FormattedMessage
        id="xpack.ingestPipelines.settingsFormOnFailureFlyout.title"
        defaultMessage="Configure on-failure processor"
      />
    ) : (
      <FormattedMessage
        id="xpack.ingestPipelines.settingsFormFlyout.title"
        defaultMessage="Configure processor"
      />
    );

    return (
      <EuiFlyout onClose={onClose}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>{flyoutTitleContent}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ProcessorSettingsForm
            onFormUpdate={onFormUpdate}
            processor={processor}
            onSubmit={onSubmit}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);
