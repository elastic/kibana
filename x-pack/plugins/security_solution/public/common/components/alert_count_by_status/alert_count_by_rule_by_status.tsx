/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

import type { Status } from '../../../../common/detection_engine/schemas/common';
import type { AdditionalFilter } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { useNavigateToTimeline } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { useQueryToggle } from '../../containers/query_toggle';
import { FormattedCount } from '../formatted_number';
import { HeaderSection } from '../header_section';
import { BUTTON_CLASS as INSPECT_BUTTON_CLASS } from '../inspect';
import { LastUpdatedAt, MultiSelectPopover } from './components';
import * as i18n from './translations';
import type { AlertCountByRuleByStatusItem } from './use_alert_count_by_rule_by_status';
import { useAlertCountByRuleByStatus } from './use_alert_count_by_rule_by_status';
import { HoverVisibilityContainer } from '../hover_visibility_container';

interface AlertCountByStatusProps {
  field: string;
  value: string;
}

type GetTableColumns = (
  openRuleInTimeline: (ruleName: string, additionalFilter: AdditionalFilter) => void,
  additionalFilter: AdditionalFilter
) => Array<EuiBasicTableColumn<AlertCountByRuleByStatusItem>>;

const statuses = ['open', 'acknowledged', 'closed'];
const ALERT_COUNT_BY_RULE_BY_STATUS = 'alerts-by-status-by-rule';

const StyledEuiPanel = euiStyled(EuiPanel)`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  height: 272px;
`;

export const AlertCountByStatus = React.memo(({ field, value }: AlertCountByStatusProps) => {
  const queryId = `${ALERT_COUNT_BY_RULE_BY_STATUS}-by-${field}`;
  const { toggleStatus, setToggleStatus } = useQueryToggle(queryId);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['open']);

  const { openRuleInTimeline } = useNavigateToTimeline();
  const columns = useMemo(
    () => getTableColumns(openRuleInTimeline, { field, value }),
    [field, value, openRuleInTimeline]
  );

  const { items, isLoading, updatedAt } = useAlertCountByRuleByStatus({
    field,
    value,
    queryId,
    statuses: selectedStatuses as Status[],
    skip: !toggleStatus,
  });

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
      <StyledEuiPanel hasBorder data-test-subj="alertCountByRulePanel">
        <>
          <HeaderSection
            id={queryId}
            title={i18n.Alerts}
            titleSize="s"
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
            subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          >
            <MultiSelectPopover
              title={i18n.Status}
              allItems={statuses}
              selectedItems={selectedStatuses}
              onSelectedItemsChange={setSelectedStatuses}
            />
          </HeaderSection>

          {toggleStatus && (
            <>
              <EuiBasicTable
                className="eui-yScroll"
                data-test-subj="alertCountByRuleTable"
                columns={columns}
                items={items}
                loading={isLoading}
                noItemsMessage={
                  <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
                }
              />
            </>
          )}
        </>
      </StyledEuiPanel>
    </HoverVisibilityContainer>
  );
});

AlertCountByStatus.displayName = 'AlertCountByStatus';

export const getTableColumns: GetTableColumns = (openRuleInTimeline, additionalFilter) => [
  {
    field: 'ruleName',
    name: i18n.COLUMN_HEADER_RULE_NAME,
    'data-test-subj': i18n.COLUMN_HEADER_RULE_NAME,
    align: 'left',
    width: '67%',
    sortable: false,
    render: (ruleName: string) => (
      <EuiToolTip
        data-test-subj={`${ruleName}-tooltip`}
        title={i18n.TOOLTIP_TITLE}
        content={ruleName}
        anchorClassName="eui-textTruncate"
      >
        <EuiText>{ruleName}</EuiText>
      </EuiToolTip>
    ),
  },
  {
    field: 'count',
    name: i18n.COLUMN_HEADER_COUNT,
    width: '33%',
    'data-test-subj': i18n.COLUMN_HEADER_COUNT,
    sortable: true,
    align: 'right',
    render: (count: number, { ruleName }) => (
      <EuiLink
        disabled={count === 0}
        onClick={() => openRuleInTimeline(ruleName, additionalFilter)}
      >
        <FormattedCount count={count} />
      </EuiLink>
    ),
  },
];
