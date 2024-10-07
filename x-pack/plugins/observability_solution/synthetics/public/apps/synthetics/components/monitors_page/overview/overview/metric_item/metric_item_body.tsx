/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { MonitorTypeBadge } from '../../../../common/components/monitor_type_badge';
import * as labels from '../../../management/monitor_list_table/labels';
import { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const MetricItemBody = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const tags = monitor.tags;
  const history = useHistory();

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <MonitorTypeBadge
            monitorType={monitor.type}
            ariaLabel={labels.getFilterForTypeMessage(monitor.type)}
            onClick={() => {
              history.push({
                search: `monitorTypes=${encodeURIComponent(JSON.stringify([monitor.type]))}`,
              });
            }}
          />
        </EuiFlexItem>
        {(tags ?? []).length > 0 && (
          <EuiFlexItem grow={false}>
            <TagsList
              color="default"
              tags={tags}
              disableExpand={true}
              onClick={(tag) => {
                history.push({ search: `tags=${encodeURIComponent(JSON.stringify([tag]))}` });
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
