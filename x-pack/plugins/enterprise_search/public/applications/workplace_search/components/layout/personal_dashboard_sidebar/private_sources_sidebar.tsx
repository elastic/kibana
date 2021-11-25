/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSideNav } from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import {
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from '../../../constants';
import { useSourceSubNav } from '../../../views/content_sources/components/source_sub_nav';
import { SourceLogic } from '../../../views/content_sources/source_logic';
import { ViewContentHeader } from '../../shared/view_content_header';

export const PrivateSourcesSidebar = () => {
  const {
    account: { canCreatePrivateSources },
  } = useValues(AppLogic);

  const PAGE_TITLE = canCreatePrivateSources
    ? PRIVATE_CAN_CREATE_PAGE_TITLE
    : PRIVATE_VIEW_ONLY_PAGE_TITLE;
  const PAGE_DESCRIPTION = canCreatePrivateSources
    ? PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
    : PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION;

  const {
    contentSource: { id = '' },
  } = useValues(SourceLogic);

  const navItems = [{ id, name: '', items: useSourceSubNav() }];

  return (
    <>
      <ViewContentHeader headingLevel={1} title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      {id && <EuiSideNav items={navItems} mobileBreakpoints={[]} />}
    </>
  );
};
