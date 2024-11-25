/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiWrappingPopover } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { StatefulTopN } from '../../../common/components/top_n';
import { getScopeFromPath } from '../../../sourcerer/containers/sourcerer_paths';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../../common/lib/kibana';

export const TopValuesPopover = React.memo(() => {
  const { pathname } = useLocation();
  const { browserFields, sourcererDataView } = useSourcererDataView(getScopeFromPath(pathname));
  const {
    services: { topValuesPopover },
  } = useKibana();
  const data = useObservable(topValuesPopover.getObservable());

  const onClose = useCallback(() => {
    topValuesPopover.closePopover();
  }, [topValuesPopover]);

  if (!data || !data.nodeRef) return null;

  return (
    <EuiWrappingPopover
      isOpen
      button={data.nodeRef}
      closePopover={onClose}
      anchorPosition={'downCenter'}
      hasArrow={false}
      repositionOnScroll
      ownFocus
      attachToAnchor={false}
    >
      <StatefulTopN
        field={data.fieldName}
        showLegend
        scopeId={data.scopeId}
        toggleTopN={onClose}
        dataViewSpec={sourcererDataView}
        browserFields={browserFields}
      />
    </EuiWrappingPopover>
  );
});

TopValuesPopover.displayName = 'TopValuesPopover';
