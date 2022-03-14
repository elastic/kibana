/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { CspPageTemplate } from '../../components/page_template';
import { RulesContainer } from './rules_container';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';

// TODO:
// - get selected integration

const pageHeader: EuiPageHeaderProps = {
  pageTitle: 'Rules',
};

const breadcrumbs = [allNavigationItems.rules];

export const Rules = () => {
  useCspBreadcrumbs(breadcrumbs);

  return (
    <CspPageTemplate pageHeader={pageHeader}>
      <RulesContainer />
    </CspPageTemplate>
  );
};
