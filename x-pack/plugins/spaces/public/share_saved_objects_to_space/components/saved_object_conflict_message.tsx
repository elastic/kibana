/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { SavedObjectConflictMessageProps } from '../types';

export const SavedObjectConflictMessage = ({ json }: SavedObjectConflictMessageProps) => {
  const [expandError, setExpandError] = useState(false);
  return (
    <>
      <FormattedMessage
        id="xpack.spaces.legacyURLConflict.longMessage"
        defaultMessage="Disable the {documentationLink} associated with this object."
        values={{
          documentationLink: (
            <EuiLink
              external
              href="https://www.elastic.co/guide/en/kibana/master/legacy-url-aliases.html"
              target="_blank"
            >
              {i18n.translate('xpack.spaces.legacyURLConflict.documentationLinkText', {
                defaultMessage: 'legacy URL alias',
              })}
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer />
      {expandError ? (
        <EuiCallOut
          title={i18n.translate('xpack.spaces.legacyURLConflict.expandErrorText', {
            defaultMessage: `This object has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
            values: { json },
          })}
          color="danger"
          iconType="alert"
        />
      ) : (
        <EuiButtonEmpty onClick={() => setExpandError(true)}>
          {i18n.translate('xpack.spaces.legacyURLConflict.expandError', {
            defaultMessage: `Show more`,
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
};
