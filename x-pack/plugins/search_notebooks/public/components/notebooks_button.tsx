/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { EmbeddedConsoleViewButtonProps } from '@kbn/console-plugin/public';

export interface SearchNotebooksButtonProps extends EmbeddedConsoleViewButtonProps {
  clearNotebookList: () => void;
}

export const SearchNotebooksButton = ({
  activeView,
  onClick,
  clearNotebookList,
}: SearchNotebooksButtonProps) => {
  React.useEffect(() => {
    return () => {
      // When the Notebooks button is unmounted we want to clear
      // any page specific contextual notebook list that was set.
      clearNotebookList();
    };
  }, [clearNotebookList]);

  if (activeView) {
    return (
      <EuiButton
        color="success"
        fill
        onClick={onClick}
        size="s"
        iconType="documentation"
        iconSide="left"
        data-test-subj="consoleEmbeddedNotebooksButton"
        data-telemetry-id="console-embedded-notebooks-button"
      >
        {i18n.translate('xpack.searchNotebooks.notebooksButton.title', {
          defaultMessage: 'Notebooks',
        })}
      </EuiButton>
    );
  }
  return (
    <EuiButtonEmpty
      color="success"
      onClick={onClick}
      size="s"
      iconType="documentation"
      iconSide="left"
      data-test-subj="consoleEmbeddedNotebooksButton"
      data-telemetry-id="console-embedded-notebooks-button"
    >
      {i18n.translate('xpack.searchNotebooks.notebooksButton.title', {
        defaultMessage: 'Notebooks',
      })}
    </EuiButtonEmpty>
  );
};
