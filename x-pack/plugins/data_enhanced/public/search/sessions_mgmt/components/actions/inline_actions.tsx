/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { TableText } from '../';
import { UISession } from '../../../../../common/search/sessions_mgmt';

interface InlineActionProps {
  url: string;
  session: UISession;
}

export const InlineActions = ({ url, session }: InlineActionProps) => {
  if (!session.isViewable) {
    return null;
  }
  // only the View action is required
  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" component="span">
      <EuiFlexItem
        key="inline-action-view"
        data-test-subj={`session-mgmt-view-action-${session.id}`}
        grow={false}
        component="span"
      >
        <TableText>
          <EuiLink href={url} data-test-subj={`session-mgmt-view-href`}>
            <FormattedMessage
              id="xpack.data.mgmt.searchSessions.actionView"
              defaultMessage="View"
            />
          </EuiLink>
        </TableText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
