/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { DrilldownTable } from '../../components/drilldown_table';
import { useDrilldownManager } from '../context';

const FIVE_SECONDS = 5e3;

export const DrilldownList: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const events = drilldowns.useEvents();
  const showCloningNotification = React.useMemo(
    () =>
      !!drilldowns.lastCloneRecord && drilldowns.lastCloneRecord.time > Date.now() - FIVE_SECONDS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  React.useEffect(() => {
    drilldowns.lastCloneRecord = null;
  });

  const notification = showCloningNotification && (
    <>
      <EuiCallOut title="Cloned" color="success" iconType="check">
        <p>You successfully, cloned 2 drilldowns.</p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  return (
    <>
      {notification}
      <DrilldownTable
        items={events}
        onDelete={drilldowns.onDelete}
        onEdit={(id) => {
          drilldowns.setRoute(['manage', id]);
        }}
        onClone={drilldowns.onCreateFromDrilldown}
      />
    </>
  );
};
