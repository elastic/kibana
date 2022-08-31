/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { find } from 'lodash';
import { useWatch } from 'react-hook-form';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { usePacks } from '../../packs/use_packs';
import { PacksComboBoxField } from '../../live_queries/form/packs_combobox_field';
import type { LiveQueryDetailsItem } from '../../actions/use_live_query_details';

interface PackFieldWrapperProps {
  liveQueryDetails?: LiveQueryDetailsItem;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => React.ReactElement;
  submitButtonContent?: React.ReactNode;
}

export const PackFieldWrapper = ({
  liveQueryDetails,
  addToTimeline,
  submitButtonContent,
}: PackFieldWrapperProps) => {
  const { data: packsData } = usePacks({});
  const { packId } = useWatch() as unknown as { packId: string[] };

  const selectedPackData = useMemo(
    () => (packId?.length ? find(packsData?.data, { id: packId[0] }) : null),
    [packId, packsData]
  );

  const actionId = useMemo(() => liveQueryDetails?.action_id, [liveQueryDetails?.action_id]);
  const agentIds = useMemo(() => liveQueryDetails?.agents, [liveQueryDetails?.agents]);

  return (
    <>
      <EuiFlexItem>
        <PacksComboBoxField
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          fieldProps={{ packsData: packsData?.data }}
          queryType={'pack'}
        />
      </EuiFlexItem>
      {submitButtonContent}
      <EuiSpacer />

      {liveQueryDetails?.queries?.length || selectedPackData?.attributes?.queries?.length ? (
        <>
          <EuiFlexItem>
            <PackQueriesStatusTable
              actionId={actionId}
              agentIds={agentIds}
              // @ts-expect-error version string !+ string[]
              data={liveQueryDetails?.queries ?? selectedPackData?.attributes?.queries}
              addToTimeline={addToTimeline}
            />
          </EuiFlexItem>
        </>
      ) : null}
    </>
  );
};
