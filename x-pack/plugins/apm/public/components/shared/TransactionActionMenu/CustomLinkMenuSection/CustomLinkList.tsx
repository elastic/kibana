/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiText } from '@elastic/eui';
import Mustache from 'mustache';
import React from 'react';
import styled from 'styled-components';
import {
  SectionLinks,
  SectionLink,
} from '../../../../../../observability/public';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { px, truncate, unit, units } from '../../../../style/variables';

const TruncateText = styled(EuiText)`
  font-weight: 500;
  line-height: ${px(units.unit)};
  ${truncate(px(units.unit * 25))}
`;

export function CustomLinkList({
  customLinks,
  transaction,
}: {
  customLinks: CustomLink[];
  transaction: Transaction;
}) {
  return (
    <SectionLinks style={{ maxHeight: px(unit * 10), overflowY: 'auto' }}>
      {customLinks.map((link) => {
        const href = getHref(link, transaction);
        return (
          <TruncateText size="s" key={link.id}>
            <SectionLink
              label={link.label}
              role="listitem"
              href={href}
              target="_blank"
            />
          </TruncateText>
        );
      })}
    </SectionLinks>
  );
}

function getHref(link: CustomLink, transaction: Transaction) {
  try {
    return Mustache.render(link.url, transaction);
  } catch (e) {
    return link.url;
  }
}
