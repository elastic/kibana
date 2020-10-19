/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface IProps {
  copy: () => void;
  toggleIsHidden: () => void;
  isHidden: boolean;
  text: React.ReactNode;
}

export const Key: React.FC<IProps> = ({ copy, toggleIsHidden, isHidden, text }) => {
  const hideIcon = isHidden ? 'eye' : 'eyeClosed';
  const hideIconLabel = isHidden
    ? i18n.translate('xpack.enterpriseSearch.appSearch.credentials.showApiKey', {
        defaultMessage: 'Show API Key',
      })
    : i18n.translate('xpack.enterpriseSearch.appSearch.credentials.hideApiKey', {
        defaultMessage: 'Hide API Key',
      });

  return (
    <>
      <EuiButtonIcon
        onClick={copy}
        iconType="copyClipboard"
        aria-label={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copyApiKey', {
          defaultMessage: 'Copy API Key to clipboard',
        })}
      />
      <EuiButtonIcon
        onClick={toggleIsHidden}
        iconType={hideIcon}
        aria-label={hideIconLabel}
        aria-pressed={!isHidden}
      />
      {text}
    </>
  );
};
