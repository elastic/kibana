/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiHorizontalRule, EuiPageHeader, EuiSpacer } from '@elastic/eui';

interface ListHeaderComponentProps {
  title: string;
  description?: string;
  listId?: string;
}

const ListHeaderComponent: FC<ListHeaderComponentProps> = ({ title, description, listId }) => {
  return (
    <>
      <EuiPageHeader pageTitle={title} description={description} />
      <EuiSpacer size="m" />
      <EuiHorizontalRule />
    </>
  );
};

ListHeaderComponent.displayName = 'ListHeaderComponent';

export const ListHeader = React.memo(ListHeaderComponent);

ListHeader.displayName = 'ListHeader';
