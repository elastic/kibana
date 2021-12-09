/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';
import { LEARN_MORE_LINK } from '../../constants';

import {
  CONNECT_WHICH_OPTION_LINK,
  CONNECT_DOC_PERMISSIONS_LABEL,
  CONNECT_DOC_PERMISSIONS_TITLE,
  CONNECT_NEEDS_PERMISSIONS,
  CONNECT_NOT_SYNCED_TITLE,
  CONNECT_NOT_SYNCED_TEXT,
} from './constants';

interface Props {
  needsPermissions: boolean;
  indexPermissionsValue: boolean;
  setValue(indexPermissionsValue: boolean): void;
}

export const DocumentPermissionsField: React.FC<Props> = ({
  needsPermissions,
  indexPermissionsValue,
  setValue,
}) => {
  const whichDocsLink = (
    <EuiLink target="_blank" href={docLinks.workplaceSearchDocumentPermissions}>
      {CONNECT_WHICH_OPTION_LINK}
    </EuiLink>
  );

  return (
    <>
      <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
        <EuiTitle size="s">
          <h1>
            <strong>{CONNECT_DOC_PERMISSIONS_TITLE}</strong>
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {!needsPermissions && (
            <span>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.connect.docPermissionsUnavailable.message"
                defaultMessage="Document-level permissions are not yet available for this source. {link}"
                values={{
                  link: (
                    <EuiLink target="_blank" href={docLinks.workplaceSearchDocumentPermissions}>
                      {LEARN_MORE_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </span>
          )}
          {needsPermissions && indexPermissionsValue && (
            <span>
              {CONNECT_NEEDS_PERMISSIONS}
              <EuiSpacer size="s" />
              {whichDocsLink}
            </span>
          )}
        </EuiText>
        {!indexPermissionsValue && (
          <>
            <EuiCallOut title={CONNECT_NOT_SYNCED_TITLE} color="warning">
              <p>
                {CONNECT_NOT_SYNCED_TEXT}
                {needsPermissions && whichDocsLink}
              </p>
            </EuiCallOut>
          </>
        )}
        <EuiSpacer />
        <EuiSwitch
          label={<strong>{CONNECT_DOC_PERMISSIONS_LABEL}</strong>}
          name="index_permissions"
          onChange={(e) => setValue(e.target.checked)}
          checked={indexPermissionsValue}
          disabled={!needsPermissions}
        />
      </EuiPanel>
      <EuiSpacer size="xl" />
    </>
  );
};
