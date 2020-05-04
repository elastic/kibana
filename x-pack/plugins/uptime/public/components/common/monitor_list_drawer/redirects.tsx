/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { redirectsSelector } from '../../../../state/selectors';

const StyledLink = styled(EuiLink)`
  margin-right: 5px;
  margin-left: 5px;
`;

export const Redirects = ({ monitorUrl }) => {
  const redirects = useSelector(redirectsSelector);

  const list = redirects?.http?.response?.redirects;

  return list ? (
    <>
      <EuiSpacer />
      <EuiText size="xs">
        <h3>
          {i18n.translate('xpack.uptime.monitorList.redirects.title', {
            defaultMessage: 'Redirects',
          })}
        </h3>
      </EuiText>
      <EuiSpacer size="s" />
      <StyledLink href={monitorUrl}>{monitorUrl}</StyledLink>
      {list.map(url => {
        return (
          <>
            <EuiIcon type="sortRight" />
            <StyledLink href={url}>{url}</StyledLink>
          </>
        );
      })}
    </>
  ) : null;
};
