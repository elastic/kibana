/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyoutBody,
  EuiFlyout,
  EuiTitle,
  EuiInMemoryTable,
  EuiSpacer,
  EuiPortal,
  EuiLoadingContent,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';

import { useLoadNodeDetails } from '../../../../../../../services/api';

interface Props {
  close: () => void;
  selectedNodeAttrs: string;
}

export const NodeAttrsDetails: React.FunctionComponent<Props> = ({ close, selectedNodeAttrs }) => {
  const { data, isLoading, error, resendRequest } = useLoadNodeDetails(selectedNodeAttrs);
  let content;
  if (isLoading) {
    content = <EuiLoadingContent lines={3} />;
  } else if (error) {
    const { statusCode, message } = error;
    content = (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeDetailsLoadingFailedTitle"
            defaultMessage="Unable to load node attribute details"
          />
        }
        color="danger"
      >
        <p>
          {message} ({statusCode})
        </p>
        <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeDetailsReloadButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </EuiCallOut>
    );
  } else {
    content = (
      <EuiInMemoryTable
        items={data || []}
        columns={[
          {
            field: 'nodeId',
            name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.idField', {
              defaultMessage: 'ID',
            }),
          },
          {
            field: 'stats.name',
            name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.nameField', {
              defaultMessage: 'Name',
            }),
          },
          {
            field: 'stats.host',
            name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.hostField', {
              defaultMessage: 'Host',
            }),
          },
        ]}
        pagination={true}
        sorting={true}
      />
    );
  }
  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={close}>
        <EuiFlyoutBody>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.nodeAttrDetails.title"
                defaultMessage="Nodes that contain the attribute {selectedNodeAttrs}"
                values={{ selectedNodeAttrs }}
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          {content}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
