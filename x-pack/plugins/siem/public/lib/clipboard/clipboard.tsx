/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Toast, EuiButtonIcon } from '@elastic/eui';
import copy from 'copy-to-clipboard';
import * as React from 'react';
import uuid from 'uuid';

import * as i18n from './translations';
import { useStateToaster } from '../../components/toasters';

export type OnCopy = (
  { content, isSuccess }: { content: string | number; isSuccess: boolean }
) => void;

interface GetSuccessToastParams {
  titleSummary?: string;
}

const getSuccessToast = ({ titleSummary }: GetSuccessToastParams): Toast => ({
  id: `copy-success-${uuid.v4()}`,
  color: 'success',
  iconType: 'copyClipboard',
  title: `${i18n.COPIED} ${titleSummary} ${i18n.TO_THE_CLIPBOARD}`,
});

interface Props {
  children: JSX.Element;
  content: string | number;
  onCopy?: OnCopy;
  titleSummary?: string;
  toastLifeTimeMs?: number;
}

export const Clipboard = ({ children, content, onCopy, titleSummary, toastLifeTimeMs }: Props) => {
  const dispatchToaster = useStateToaster()[1];
  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const isSuccess = copy(`${content}`, { debug: true });

    if (onCopy != null) {
      onCopy({ content, isSuccess });
    }

    if (isSuccess) {
      dispatchToaster({
        type: 'addToaster',
        toast: { toastLifeTimeMs, ...getSuccessToast({ titleSummary }) },
      });
    }
  };

  return (
    <EuiButtonIcon
      aria-label={i18n.COPY_TO_THE_CLIPBOARD}
      color="subdued"
      data-test-subj="clipboard"
      iconSize="s"
      iconType="copyClipboard"
      onClick={onClick}
    >
      {children}
    </EuiButtonIcon>
  );
};
