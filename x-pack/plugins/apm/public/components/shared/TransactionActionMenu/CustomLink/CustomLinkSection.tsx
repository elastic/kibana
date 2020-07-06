/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLink, EuiText } from '@elastic/eui';
import Mustache from 'mustache';
import React from 'react';
import styled from 'styled-components';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { px, truncate, units } from '../../../../style/variables';

const LinkContainer = styled.li`
  margin-top: ${px(units.half)};
  &:first-of-type {
    margin-top: 0;
  }
`;

const TruncateText = styled(EuiText)`
  font-weight: 500;
  line-height: ${px(units.unit)};
  ${truncate(px(units.unit * 25))}
`;

export const CustomLinkSection = ({
  customLinks,
  transaction,
}: {
  customLinks: CustomLink[];
  transaction: Transaction;
}) => (
  <ul>
    {customLinks.map((link) => {
      let href = link.url;
      try {
        href = Mustache.render(link.url, transaction);
      } catch (e) {
        // ignores any error that happens
      }
      return (
        <LinkContainer key={link.id}>
          <EuiLink href={href} target="_blank">
            <TruncateText size="s">{link.label}</TruncateText>
          </EuiLink>
        </LinkContainer>
      );
    })}
  </ul>
);
