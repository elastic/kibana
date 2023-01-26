/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiContextMenuItem, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const COPY_ICON = 'copyClipboard';
const COPY_TITLE = i18n.translate(
  'xpack.threatIntelligence.indicators.table.copyToClipboardLabel',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export interface CopyToClipboardProps {
  /**
   * Value to copy to clipboard.
   */
  value: string;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Takes a string and copies it to the clipboard.
 *
 * This component renders an {@link EuiButtonEmpty}.
 *
 * @returns An EuiCopy element
 */
export const CopyToClipboardButtonEmpty: VFC<CopyToClipboardProps> = ({
  value,
  'data-test-subj': dataTestSub,
}) => (
  <EuiCopy textToCopy={value}>
    {(copy) => (
      <EuiButtonEmpty
        aria-label={COPY_TITLE}
        iconType={COPY_ICON}
        iconSize="s"
        color="primary"
        onClick={copy}
        data-test-subj={dataTestSub}
      >
        {COPY_TITLE}
      </EuiButtonEmpty>
    )}
  </EuiCopy>
);

/**
 * Takes a string and copies it to the clipboard.
 *
 * This component is to be used in an EuiContextMenu.
 *
 * @returns filter in {@link EuiContextMenuItem} for a context menu
 */
export const CopyToClipboardContextMenu: VFC<CopyToClipboardProps> = ({
  value,
  'data-test-subj': dataTestSub,
}) => (
  <EuiCopy textToCopy={value}>
    {(copy) => (
      <EuiContextMenuItem
        key="copyToClipboard"
        icon={COPY_ICON}
        size="s"
        onClick={copy}
        data-test-subj={dataTestSub}
      >
        {COPY_TITLE}
      </EuiContextMenuItem>
    )}
  </EuiCopy>
);

/**
 * Takes a string and copies it to the clipboard.
 *
 * This component renders an {@link EuiButtonIcon}.
 *
 * @returns An EuiCopy element
 */
export const CopyToClipboardButtonIcon: VFC<CopyToClipboardProps> = ({
  value,
  'data-test-subj': dataTestSub,
}) => (
  <EuiCopy textToCopy={value}>
    {(copy) => (
      <EuiButtonIcon
        aria-label={COPY_TITLE}
        iconType={COPY_ICON}
        iconSize="s"
        color="primary"
        onClick={copy}
        data-test-subj={dataTestSub}
      >
        {COPY_TITLE}
      </EuiButtonIcon>
    )}
  </EuiCopy>
);
