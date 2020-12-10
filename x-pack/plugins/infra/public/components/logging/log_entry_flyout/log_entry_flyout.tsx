/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { euiStyled } from '../../../../../observability/public';
import {
  LogEntry,
  LogEntryField,
} from '../../../../common/search_strategies/log_entries/log_entry';
import { TimeKey } from '../../../../common/time';
import { InfraLoadingPanel } from '../../loading';
import { FieldValue } from '../log_text_stream/field_value';
import { LogEntryActionsMenu } from './log_entry_actions_menu';

export interface LogEntryFlyoutProps {
  flyoutError: string | null;
  flyoutItem: LogEntry | null;
  setFlyoutVisibility: (visible: boolean) => void;
  setFilter: (filter: string, flyoutItemId: string, timeKey?: TimeKey) => void;
  loading: boolean;
}

const emptyHighlightTerms: string[] = [];

const initialSortingOptions = {
  sort: {
    field: 'field',
    direction: 'asc' as const,
  },
};

const searchOptions = {
  box: {
    incremental: true,
    schema: true,
  },
};

export const LogEntryFlyout = ({
  flyoutError,
  flyoutItem,
  loading,
  setFlyoutVisibility,
  setFilter,
}: LogEntryFlyoutProps) => {
  const createFilterHandler = useCallback(
    (field: LogEntryField) => () => {
      if (!flyoutItem) {
        return;
      }

      const filter = `${field.field}:"${field.value}"`;
      const timestampMoment = moment(flyoutItem.key.time);
      let target;

      if (timestampMoment.isValid()) {
        target = {
          time: timestampMoment.valueOf(),
          tiebreaker: flyoutItem.key.tiebreaker,
        };
      }

      setFilter(filter, flyoutItem.id, target);
    },
    [flyoutItem, setFilter]
  );

  const closeFlyout = useCallback(() => setFlyoutVisibility(false), [setFlyoutVisibility]);

  const columns = useMemo<Array<EuiBasicTableColumn<LogEntryField>>>(
    () => [
      {
        field: 'field',
        name: i18n.translate('xpack.infra.logFlyout.fieldColumnLabel', {
          defaultMessage: 'Field',
        }),
        sortable: true,
      },
      {
        field: 'value',
        name: i18n.translate('xpack.infra.logFlyout.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        render: (_name: string, item: LogEntryField) => (
          <span>
            <EuiToolTip
              content={i18n.translate('xpack.infra.logFlyout.setFilterTooltip', {
                defaultMessage: 'View event with filter',
              })}
            >
              <EuiButtonIcon
                color="text"
                iconType="filter"
                aria-label={i18n.translate('xpack.infra.logFlyout.filterAriaLabel', {
                  defaultMessage: 'Filter',
                })}
                onClick={createFilterHandler(item)}
              />
            </EuiToolTip>
            <FieldValue
              highlightTerms={emptyHighlightTerms}
              isActiveHighlight={false}
              value={item.value}
            />
          </span>
        ),
      },
    ],
    [createFilterHandler]
  );

  return (
    <EuiFlyout onClose={closeFlyout} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="Details for log entry {logEntryId}"
                  id="xpack.infra.logFlyout.flyoutTitle"
                  values={{
                    logEntryId: flyoutItem ? <code>{flyoutItem.id}</code> : '',
                  }}
                />
              </h3>
            </EuiTitle>
            {flyoutItem ? (
              <>
                <EuiSpacer size="s" />
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.infra.logFlyout.flyoutSubTitle"
                    defaultMessage="From index {indexName}"
                    values={{
                      indexName: <code>{flyoutItem.index}</code>,
                    }}
                  />
                </EuiTextColor>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {flyoutItem !== null ? <LogEntryActionsMenu logEntry={flyoutItem} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading ? (
          <InfraFlyoutLoadingPanel>
            <InfraLoadingPanel
              height="100%"
              width="100%"
              text={i18n.translate('xpack.infra.logFlyout.loadingMessage', {
                defaultMessage: 'Loading Event',
              })}
            />
          </InfraFlyoutLoadingPanel>
        ) : flyoutItem ? (
          <EuiInMemoryTable<LogEntryField>
            columns={columns}
            items={flyoutItem.fields}
            search={searchOptions}
            sorting={initialSortingOptions}
          />
        ) : (
          <InfraFlyoutLoadingPanel>{flyoutError}</InfraFlyoutLoadingPanel>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const InfraFlyoutLoadingPanel = euiStyled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;
