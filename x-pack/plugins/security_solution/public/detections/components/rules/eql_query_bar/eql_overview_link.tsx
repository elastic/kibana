/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiLink, EuiText } from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { EQL_OVERVIEW_LINK_TEXT } from './translations';

const InlineText = styled(EuiText)`
  display: inline-block;
`;

export const EqlOverviewLink = () => {
  const overviewUrl = useKibana().services.docLinks.links.query.eql;

  return (
    <EuiLink external href={overviewUrl} target="_blank">
      <InlineText size="xs">{EQL_OVERVIEW_LINK_TEXT}</InlineText>
    </EuiLink>
  );
};
