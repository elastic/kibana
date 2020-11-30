/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useVisibilityState } from '../../../utils/use_visibility_state';
import { getTraceUrl } from '../../../../../apm/public';
import { LogEntriesItem } from '../../../../common/http_api';
import { useLinkProps, LinkDescriptor } from '../../../hooks/use_link_props';

const UPTIME_FIELDS = ['container.id', 'host.ip', 'kubernetes.pod.uid'];

export const LogEntryActionsMenu: React.FunctionComponent<{
  logItem: LogEntriesItem;
}> = ({ logItem }) => {
  const { hide, isVisible, show } = useVisibilityState(false);

  const apmLinkDescriptor = useMemo(() => getAPMLink(logItem), [logItem]);
  const uptimeLinkDescriptor = useMemo(() => getUptimeLink(logItem), [logItem]);

  const uptimeLinkProps = useLinkProps({
    app: 'uptime',
    ...(uptimeLinkDescriptor ? uptimeLinkDescriptor : {}),
  });

  const apmLinkProps = useLinkProps({
    app: 'apm',
    ...(apmLinkDescriptor ? apmLinkDescriptor : {}),
  });

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem uptimeLogEntryActionsMenuItem"
        disabled={!uptimeLinkDescriptor}
        icon="uptimeApp"
        key="uptimeLink"
        {...uptimeLinkProps}
      >
        <FormattedMessage
          id="xpack.infra.logEntryActionsMenu.uptimeActionLabel"
          defaultMessage="View status in Uptime"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem apmLogEntryActionsMenuItem"
        disabled={!apmLinkDescriptor}
        icon="apmApp"
        key="apmLink"
        {...apmLinkProps}
      >
        <FormattedMessage
          id="xpack.infra.logEntryActionsMenu.apmActionLabel"
          defaultMessage="View in APM"
        />
      </EuiContextMenuItem>,
    ],
    [uptimeLinkDescriptor, apmLinkDescriptor, apmLinkProps, uptimeLinkProps]
  );

  const hasMenuItems = useMemo(() => menuItems.length > 0, [menuItems]);
  return (
    <EuiPopover
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          data-test-subj="logEntryActionsMenuButton"
          disabled={!hasMenuItems}
          iconSide="right"
          iconType="arrowDown"
          onClick={show}
        >
          <FormattedMessage
            id="xpack.infra.logEntryActionsMenu.buttonLabel"
            defaultMessage="Actions"
          />
        </EuiButtonEmpty>
      }
      closePopover={hide}
      id="logEntryActionsMenu"
      isOpen={isVisible}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};

const getUptimeLink = (logItem: LogEntriesItem): LinkDescriptor | undefined => {
  const searchExpressions = logItem.fields
    .filter(({ field, value }) => value != null && UPTIME_FIELDS.includes(field))
    .reduce<string[]>((acc, fieldItem) => {
      const { field, value } = fieldItem;
      return acc.concat(value.map((val) => `${field}:${val}`));
    }, []);

  if (searchExpressions.length === 0) {
    return undefined;
  }
  return {
    app: 'uptime',
    hash: '/',
    search: {
      search: `${searchExpressions.join(' or ')}`,
    },
  };
};

const getAPMLink = (logItem: LogEntriesItem): LinkDescriptor | undefined => {
  const traceIdEntry = logItem.fields.find(
    ({ field, value }) => value[0] != null && field === 'trace.id'
  );

  if (!traceIdEntry) {
    return undefined;
  }

  const timestampField = logItem.fields.find(({ field }) => field === '@timestamp');
  const timestamp = timestampField ? timestampField.value[0] : null;
  const { rangeFrom, rangeTo } = timestamp
    ? (() => {
        const from = new Date(timestamp);
        const to = new Date(timestamp);

        from.setMinutes(from.getMinutes() - 10);
        to.setMinutes(to.getMinutes() + 10);

        return { rangeFrom: from.toISOString(), rangeTo: to.toISOString() };
      })()
    : { rangeFrom: 'now-1y', rangeTo: 'now' };

  return {
    app: 'apm',
    hash: getTraceUrl({ traceId: traceIdEntry.value[0], rangeFrom, rangeTo }),
  };
};
