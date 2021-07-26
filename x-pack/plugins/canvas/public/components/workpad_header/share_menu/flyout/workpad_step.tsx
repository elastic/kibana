/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiText, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { JSON } from '../../../../../i18n/constants';

import { OnDownloadFn } from './flyout';

const strings = {
  getDownloadLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.workpadStep.downloadLabel', {
      defaultMessage: 'Download workpad',
    }),
  getStepDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.workpadStep.description', {
      defaultMessage:
        'The workpad will be exported as a single {JSON} file for sharing in another site.',
      values: {
        JSON,
      },
    }),
};

export const WorkpadStep: FC<{ onDownload: OnDownloadFn }> = ({ onDownload }) => (
  <EuiText size="s">
    <p>{strings.getStepDescription()}</p>
    <EuiSpacer size="s" />
    <EuiButton
      onClick={() => {
        onDownload('share');
      }}
      size="s"
    >
      {strings.getDownloadLabel()}
    </EuiButton>
  </EuiText>
);
