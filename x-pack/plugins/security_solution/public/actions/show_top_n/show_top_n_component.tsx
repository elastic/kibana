/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiWrappingPopover } from '@elastic/eui';

import { useLocation } from 'react-router-dom';
import type { CasesUiStart } from '@kbn/cases-plugin/public';
import { StatefulTopN } from '../../common/components/top_n';
import { useGetUserCasesPermissions } from '../../common/lib/kibana';
import { APP_ID } from '../../../common/constants';
import { getScopeFromPath, useSourcererDataView } from '../../common/containers/sourcerer';
import type { ShowTopNActionContext } from './default/show_top_n';

export const TopNAction = ({
  onClose,
  context,
  casesService,
}: {
  onClose: () => void;
  context: ShowTopNActionContext;
  casesService: CasesUiStart;
}) => {
  const { pathname } = useLocation();
  const { browserFields, indexPattern } = useSourcererDataView(getScopeFromPath(pathname));
  const userCasesPermissions = useGetUserCasesPermissions();
  const CasesContext = casesService.ui.getCasesContext();
  const { field, nodeRef, metadata } = context;

  if (!nodeRef?.current) return null;

  return (
    <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
      <EuiWrappingPopover
        button={nodeRef.current}
        isOpen={true}
        closePopover={onClose}
        anchorPosition={'downCenter'}
        hasArrow={false}
        repositionOnScroll
        ownFocus
        attachToAnchor={false}
      >
        <StatefulTopN
          field={field.name}
          showLegend
          scopeId={metadata?.scopeId}
          toggleTopN={onClose}
          value={field.value}
          indexPattern={indexPattern}
          browserFields={browserFields}
        />
      </EuiWrappingPopover>
    </CasesContext>
  );
};
