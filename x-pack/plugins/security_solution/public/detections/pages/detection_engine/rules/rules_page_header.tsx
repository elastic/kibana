/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HeaderPage } from '../../../../common/components/header_page';
import { useRulesTableContext } from '../../../containers/detection_engine/rules/rules_table/rules_table_context';

import * as i18n from './translations';

interface RulesPageHeaderProps {
  children: React.ReactNode;
}

export const RulesPageHeader = ({ children }: RulesPageHeaderProps) => {
  const { isInMemorySorting } = useRulesTableContext().state;

  return (
    <HeaderPage
      title={i18n.PAGE_TITLE}
      badgeOptions={
        isInMemorySorting == null
          ? undefined // Rules data is not loaded yet, and we don't know whether in-memory sorting is enabled or not
          : {
              text: isInMemorySorting ? i18n.EXPERIMENTAL_ON : i18n.EXPERIMENTAL_OFF,
              tooltip: isInMemorySorting
                ? i18n.EXPERIMENTAL_ON_DESCRIPTION
                : i18n.EXPERIMENTAL_OFF_DESCRIPTION,
              beta: true,
            }
      }
    >
      {children}
    </HeaderPage>
  );
};
