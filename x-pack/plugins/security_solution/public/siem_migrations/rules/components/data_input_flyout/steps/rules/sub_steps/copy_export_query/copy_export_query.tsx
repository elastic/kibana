/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RULES_SPL_QUERY } from '../../../../constants';
import * as i18n from './translations';

interface CopyExportQueryProps {
  onCopied: () => void;
}
export const CopyExportQuery = React.memo<CopyExportQueryProps>(({ onCopied }) => {
  const onClick: React.MouseEventHandler = useCallback(
    (ev) => {
      // The only button inside the element is the "copy" button.
      if ((ev.target as Element).tagName === 'BUTTON') {
        onCopied();
      }
    },
    [onCopied]
  );

  return (
    <>
      {/* The click event is also dispatched when using the keyboard actions (space or enter) for "copy" button. 
        No need to use keyboard specific events, disabling the a11y lint rule:*/}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div onClick={onClick}>
        {/* onCopy react event is dispatched when the user copies text manually */}
        <EuiCodeBlock language="text" fontSize="m" paddingSize="m" isCopyable onCopy={onCopied}>
          {RULES_SPL_QUERY}
        </EuiCodeBlock>
      </div>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.copyExportQuery.description"
          defaultMessage="From you admin Splunk account, go to the {section} app and run the above query. Export your results as {format}."
          values={{
            section: <b>{i18n.RULES_DATA_INPUT_COPY_DESCRIPTION_SECTION}</b>,
            format: <b>{'JSON'}</b>,
          }}
        />
      </EuiText>
    </>
  );
});
CopyExportQuery.displayName = 'CopyExportQuery';
