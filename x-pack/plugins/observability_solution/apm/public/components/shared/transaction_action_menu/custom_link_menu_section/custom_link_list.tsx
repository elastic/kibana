/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SectionLink, SectionLinks } from '@kbn/observability-shared-plugin/public';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { unit } from '../../../../utils/style';
import { getEncodedCustomLinkUrl } from '../../../../../common/custom_link';
import type { FlattenedTransaction } from '../../../../../server/routes/settings/custom_link/get_transaction';

export function CustomLinkList({
  customLinks,
  transactionFields,
}: {
  customLinks: CustomLink[];
  transactionFields?: FlattenedTransaction;
}) {
  return (
    <SectionLinks style={{ maxHeight: unit * 10, overflowY: 'auto' }}>
      {customLinks.map((link) => {
        const href = getEncodedCustomLinkUrl(link.url, transactionFields);
        return <SectionLink key={link.id} label={link.label} href={href} target="_blank" />;
      })}
    </SectionLinks>
  );
}
