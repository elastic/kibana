/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

interface ListItemType {
  label: JSX.Element;
}

const listContent: ListItemType[] = [
  {
    label: (
      <FormattedMessage
        id="xpack.siem.overview.feature.documentation"
        defaultMessage="Check out the {link}"
        values={{
          link: (
            <EuiLink href="#">
              <FormattedMessage
                id="xpack.siem.overview.feature.documentation.link"
                defaultMessage="Documentation"
              />
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    label: (
      <FormattedMessage
        id="xpack.siem.overview.feature.dataIngestion"
        defaultMessage="Learn about {link}"
        values={{
          link: (
            <EuiLink href="#">
              <FormattedMessage
                id="xpack.siem.overview.feature.dataIngestion.link"
                defaultMessage="Data Ingestion"
              />
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    label: (
      <FormattedMessage
        id="xpack.siem.overview.feature.blog"
        defaultMessage="Go to {blog} and {video}"
        values={{
          blog: (
            <EuiLink href="#">
              <FormattedMessage
                id="xpack.siem.overview.feature.blog.blog"
                defaultMessage="Blog Posts"
              />
            </EuiLink>
          ),
          video: (
            <EuiLink href="#">
              <FormattedMessage
                id="xpack.siem.overview.feature.blog.video"
                defaultMessage="Videos"
              />
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

export const Summary = pure(() => (
  <EuiFlexGroup justifyContent="spaceAround">
    <StyledEuiFlexItem grow={false}>
      <EuiTitle size="s">
        <h3>{i18n.FEATURE_OVERVIEW_HEADING}</h3>
      </EuiTitle>
      <EuiText>
        <ol>
          {listContent.map(({ label }, i) => (
            <li key={`${i}-${label}`}>{label}</li>
          ))}
        </ol>
      </EuiText>
    </StyledEuiFlexItem>
  </EuiFlexGroup>
));

const StyledEuiFlexItem = styled(EuiFlexItem)`
  min-width: 350px;
`;
