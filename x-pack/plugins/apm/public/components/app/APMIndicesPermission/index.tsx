/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { fontSize, pct, px, units } from '../../../style/variables';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';

export const APMIndicesPermission: React.FC = ({ children }) => {
  const [
    isPermissionWarningDismissed,
    setIsPermissionWarningDismissed,
  ] = useState(false);

  const { data: indicesPrivileges, status } = useFetcher((callApmApi) => {
    return callApmApi({
      pathname: '/api/apm/security/indices_privileges',
    });
  }, []);

  // Return null until receive the reponse of the api.
  if (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING) {
    return null;
  }

  // Show permission warning when a user has at least one index without Read privilege,
  // and they have not manually dismissed the warning
  if (
    indicesPrivileges &&
    !indicesPrivileges.has_all_requested &&
    !isEmpty(indicesPrivileges.index) &&
    !isPermissionWarningDismissed
  ) {
    const indicesWithoutPermission = Object.keys(
      indicesPrivileges.index
    ).filter((index) => !indicesPrivileges.index[index].read);
    return (
      <PermissionWarning
        indicesWithoutPermission={indicesWithoutPermission}
        onEscapeHatchClick={() => setIsPermissionWarningDismissed(true)}
      />
    );
  }

  return <>{children}</>;
};

const CentralizedContainer = styled.div`
  height: ${pct(100)};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const EscapeHatch = styled.div`
  width: ${pct(100)};
  margin-top: ${px(units.plus)};
  justify-content: center;
  display: flex;
`;

interface Props {
  indicesWithoutPermission: string[];
  onEscapeHatchClick: () => void;
}

const PermissionWarning = ({
  indicesWithoutPermission,
  onEscapeHatchClick,
}: Props) => {
  return (
    <div style={{ height: pct(95) }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.apm.permission.apm', {
                defaultMessage: 'APM',
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SetupInstructionsLink />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CentralizedContainer>
        <div>
          <EuiPanel paddingSize="none">
            <EuiEmptyPrompt
              iconType="apmApp"
              iconColor={''}
              title={
                <h2>
                  {i18n.translate('xpack.apm.permission.title', {
                    defaultMessage: 'Missing permissions to access APM',
                  })}
                </h2>
              }
              body={
                <>
                  <p>
                    {i18n.translate('xpack.apm.permission.description', {
                      defaultMessage:
                        "Your user doesn't have access to all APM indices. You can still use the APM app but some data may be missing. You must be granted access to the following indices:",
                    })}
                  </p>
                  <ul style={{ listStyleType: 'none' }}>
                    {indicesWithoutPermission.map((index) => (
                      <li key={index} style={{ marginTop: units.half }}>
                        <EuiText size="s">{index}</EuiText>
                      </li>
                    ))}
                  </ul>
                </>
              }
              actions={
                <>
                  <ElasticDocsLink
                    section="/apm/server"
                    path="/feature-roles.html"
                  >
                    {(href: string) => (
                      <EuiButton color="primary" fill href={href}>
                        {i18n.translate('xpack.apm.permission.learnMore', {
                          defaultMessage: 'Learn more about APM permissions',
                        })}
                      </EuiButton>
                    )}
                  </ElasticDocsLink>
                  <EscapeHatch>
                    <EuiLink
                      color="subdued"
                      onClick={onEscapeHatchClick}
                      style={{ fontSize }}
                    >
                      {i18n.translate('xpack.apm.permission.dismissWarning', {
                        defaultMessage: 'Dismiss',
                      })}
                    </EuiLink>
                  </EscapeHatch>
                </>
              }
            />
          </EuiPanel>
        </div>
      </CentralizedContainer>
    </div>
  );
};
