/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { UISession } from '../../types';
import { TableText } from '..';
import { CodeEditor } from '../../../../../../../../src/plugins/kibana_react/public';
import './inspect_button.scss';
import { OnActionClick, OnActionDismiss } from './types';

interface InspectFlyoutProps {
  searchSession: UISession;
  onActionClick: OnActionClick;
  onActionDismiss: OnActionDismiss;
}

const InspectFlyout = ({ onActionDismiss, searchSession }: InspectFlyoutProps) => {
  const renderInfo = () => {
    return (
      <Fragment>
        <CodeEditor
          languageId="json"
          value={JSON.stringify(searchSession.initialState, null, 2)}
          onChange={() => {}}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </Fragment>
    );
  };

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={onActionDismiss}
        size="s"
        aria-labelledby="flyoutTitle"
        data-test-subj="searchSessionsFlyout"
        className="searchSessionsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.data.sessions.management.flyoutTitle"
                defaultMessage="Inspect search session"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <EuiText size="xs">
              <p>
                <FormattedMessage
                  id="xpack.data.sessions.management.flyoutText"
                  defaultMessage="Configuration for this search session"
                />
              </p>
            </EuiText>
            <EuiSpacer />
            {renderInfo()}
          </EuiText>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
export const InspectButton = (props: InspectFlyoutProps) => {
  const { onActionClick } = props;
  return (
    <Fragment>
      <TableText
        onClick={() => {
          onActionClick(<InspectFlyout {...props} />);
        }}
      >
        <FormattedMessage
          id="xpack.data.mgmt.searchSessions.flyoutTitle"
          aria-label="Inspect"
          defaultMessage="Inspect"
        />
      </TableText>
    </Fragment>
  );
};
