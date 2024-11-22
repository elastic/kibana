/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiMarkdownEditor, EuiMarkdownFormat, EuiTitle } from '@elastic/eui';
import { SideHeader } from '../../../../../detection_engine/rule_management/components/rule_details/three_way_diff/components/side_header';
import { FinalSideHelpInfo } from '../../../../../detection_engine/rule_management/components/rule_details/three_way_diff/final_side/final_side_help_info';
import * as i18n from './translations';

interface RuleQueryProps {
  title: string;
  query: string;
  canEdit?: boolean;
}

export const RuleQueryComponent = ({ title, query, canEdit }: RuleQueryProps) => {
  const queryTextComponent = useMemo(() => {
    if (canEdit) {
      return (
        <EuiMarkdownEditor
          aria-label={i18n.TRANSLATED_QUERY_AREAL_LABEL}
          value={query}
          onChange={() => {}}
          height={400}
          initialViewMode={'viewing'}
        />
      );
    } else {
      return <EuiMarkdownFormat>{query}</EuiMarkdownFormat>;
    }
  }, [canEdit, query]);
  return (
    <>
      <SideHeader>
        <EuiTitle size="xxs">
          <h3>
            {title}
            <FinalSideHelpInfo />
          </h3>
        </EuiTitle>
      </SideHeader>
      {queryTextComponent}
    </>
  );
};
