/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface PageProps {
  goToKibana: () => void;
  retry: () => void;
}
export const Page: SFC<PageProps> = ({ goToKibana, retry }) => (
  <EuiPage>
    <EuiPageBody>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.ml.dataframe.accessDeniedTitle"
                defaultMessage="Access denied"
              />
            </h1>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.noPermissionToAccessMLLabel', {
            defaultMessage: 'You need permission to access Data Frames',
          })}
          color="danger"
          iconType="cross"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.ml.dataframe.noGrantedPrivilegesDescription"
                defaultMessage="You must have the privileges granted in the {kibanaUserParam} and {dataFrameUserParam} roles.{br}Your system admin can set these roles on the Management User page."
                values={{
                  kibanaUserParam: <span className="text-monospace">kibana_user</span>,
                  dataFrameUserParam: (
                    <span className="text-monospace">data_frame_transforms_user</span>
                  ),
                  br: <br />,
                }}
              />
            </p>
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={goToKibana} size="s">
              <FormattedMessage
                id="xpack.ml.dataframe.accessDenied.backToKibanaHomeButtonLabel"
                defaultMessage="Back to Kibana home"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={retry} size="s">
              <FormattedMessage
                id="xpack.ml.dataframe.accessDenied.retryButtonLabel"
                defaultMessage="Retry"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </EuiPageBody>
  </EuiPage>
);
