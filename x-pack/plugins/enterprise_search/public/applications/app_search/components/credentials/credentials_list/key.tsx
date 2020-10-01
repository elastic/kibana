/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  copy: () => void;
  toggleIsHidden: () => void;
  isHidden: boolean;
  text: string;
}

export const Key: React.FC<Props> = ({ copy, toggleIsHidden, isHidden, text }) => {
  const icon = isHidden ? 'eye' : 'eyeClosed';
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
        iconType={icon}
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.credentials.toggleApiEndpoint',
          {
            defaultMessage: 'Toggle API Key visibility',
          }
        )}
      />
      {text}
    </>
  );
};
