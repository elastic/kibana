/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Toast } from '@elastic/eui';
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
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
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

  // TODO: 1 error is: Visible, non-interactive elements with click handlers must have at least one keyboard listener
  // TODO: 2 error is: Elements with the 'button' interactive role must be focusable
  // TODO: Investigate this error
  /* eslint-disable */
  return (
    <>
      <div role="button" data-test-subj="clipboard" onClick={onClick}>
        {children}
      </div>
    </>
  );
  /* eslint-enable */
};
