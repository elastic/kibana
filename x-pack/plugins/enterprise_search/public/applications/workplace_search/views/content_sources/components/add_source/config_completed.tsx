/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiLinkTo, EuiButtonTo } from '../../../../../shared/react_router_helpers';
import {
  getSourcesPath,
  ADD_SOURCE_PATH,
  SECURITY_PATH,
  PRIVATE_SOURCES_DOCS_URL,
} from '../../../../routes';

import {
  CONFIG_COMPLETED_PRIVATE_SOURCES_DOCS_LINK,
  CONFIG_COMPLETED_CONFIGURE_NEW_BUTTON,
} from './constants';

interface ConfigCompletedProps {
  header: React.ReactNode;
  name: string;
  accountContextOnly?: boolean;
  privateSourcesEnabled: boolean;
  advanceStep(): void;
}

export const ConfigCompleted: React.FC<ConfigCompletedProps> = ({
  name,
  advanceStep,
  accountContextOnly,
  header,
  privateSourcesEnabled,
}) => (
  <>
    {header}
    <EuiSpacer size="xxl" />
    <EuiFlexGroup
      justifyContent="center"
      alignItems="stretch"
      direction="column"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <EuiTextAlign textAlign="center">
                <h1>
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.heading',
                    {
                      defaultMessage: '{name} Configured',
                      values: { name },
                    }
                  )}
                </h1>
              </EuiTextAlign>
            </EuiText>
            <EuiText>
              <EuiTextAlign textAlign="center">
                {!accountContextOnly ? (
                  <p data-test-subj="OrgCanConnectMessage">
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.orgCanConnect.message',
                      {
                        defaultMessage: '{name} can now be connected to Workplace Search',
                        values: { name },
                      }
                    )}
                  </p>
                ) : (
                  <EuiText color="subdued" grow={false} data-test-subj="PersonalConnectLinkMessage">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.personalConnectLink.message',
                        {
                          defaultMessage:
                            'Users can now link their {name} accounts from their personal dashboards.',
                          values: { name },
                        }
                      )}
                    </p>
                    {!privateSourcesEnabled && (
                      <p data-test-subj="PrivateDisabledMessage">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.privateDisabled.message"
                          defaultMessage="Remember to {securityLink} in Security settings."
                          values={{
                            securityLink: (
                              <EuiLinkTo to={SECURITY_PATH}>
                                enable private source connection
                              </EuiLinkTo>
                            ),
                          }}
                        />
                      </p>
                    )}
                    <p>
                      <EuiLink
                        target="_blank"
                        data-test-subj="ConfigCompletedPrivateSourcesDocsLink"
                        href={PRIVATE_SOURCES_DOCS_URL}
                      >
                        {CONFIG_COMPLETED_PRIVATE_SOURCES_DOCS_LINK}
                      </EuiLink>
                    </p>
                  </EuiText>
                )}
              </EuiTextAlign>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer />
    <EuiFlexGroup justifyContent="center" alignItems="center" direction="row" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonTo
          to={getSourcesPath(ADD_SOURCE_PATH, true)}
          fill={accountContextOnly}
          color={accountContextOnly ? 'primary' : undefined}
        >
          {CONFIG_COMPLETED_CONFIGURE_NEW_BUTTON}
        </EuiButtonTo>
      </EuiFlexItem>
      {!accountContextOnly && (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            onClick={advanceStep}
            data-test-subj="ConfigCompletedConnectButton"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.connect.button',
              {
                defaultMessage: 'Connect {name}',
                values: { name },
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </>
);
