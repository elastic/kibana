/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import React from 'react';
import {
  SectionLink,
  SectionLinks,
} from '@kbn/observability-shared-plugin/public';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { unit } from '../../../../utils/style';

// override the mustache.js escape function to not escape special characters
Mustache.escape = (text) => text;

export function CustomLinkList({
  customLinks,
  transaction,
}: {
  customLinks: CustomLink[];
  transaction?: Transaction;
}) {
  return (
    <SectionLinks style={{ maxHeight: unit * 10, overflowY: 'auto' }}>
      {customLinks.map((link) => {
        const href = getParsedCustomLinkUrl(link, transaction);
        return (
          <SectionLink
            key={link.id}
            label={link.label}
            href={href}
            target="_blank"
          />
        );
      })}
    </SectionLinks>
  );
}

export function getParsedCustomLinkUrl(
  link: CustomLink,
  transaction?: Transaction
) {
  try {
    return encodeURI(Mustache.render(link.url, transaction));
  } catch (e) {
    return link.url;
  }
}
