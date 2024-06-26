/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { find } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type {
  EnrichedFieldInfo,
  EnrichedFieldInfoWithValues,
} from '../../../../common/components/event_details/types';
import { SIGNAL_STATUS_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { StatusPopoverButton } from '../../../../common/components/event_details/overview/status_popover_button';
import { useDocumentDetailsContext } from '../../shared/context';
import { getEnrichedFieldInfo } from '../../../../common/components/event_details/helpers';
import { CellActions } from './cell_actions';
import { STATUS_TITLE_TEST_ID } from './test_ids';

/**
 * Checks if the field info has data to convert EnrichedFieldInfo into EnrichedFieldInfoWithValues
 */
function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedFieldInfoWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

/**
 * Document details status displayed in flyout right section header
 */
export const DocumentStatus: FC = () => {
  const { closeFlyout } = useExpandableFlyoutApi();
  const { eventId, browserFields, dataFormattedForFieldBrowser, scopeId, isPreview } =
    useDocumentDetailsContext();

  const statusData = useMemo(() => {
    const item = find(
      { field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' },
      dataFormattedForFieldBrowser
    );
    return (
      item &&
      getEnrichedFieldInfo({
        eventId,
        contextId: scopeId,
        scopeId,
        browserFields,
        item,
      })
    );
  }, [browserFields, dataFormattedForFieldBrowser, eventId, scopeId]);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" data-test-subj={STATUS_TITLE_TEST_ID}>
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.statusTitle"
              defaultMessage="Status"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {!statusData || !hasData(statusData) || isPreview ? (
          getEmptyTagValue()
        ) : (
          <CellActions field={SIGNAL_STATUS_FIELD_NAME} value={statusData.values[0]}>
            <StatusPopoverButton
              eventId={eventId}
              contextId={scopeId}
              enrichedFieldInfo={statusData}
              scopeId={scopeId}
              handleOnEventClosed={closeFlyout}
            />
          </CellActions>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

DocumentStatus.displayName = 'DocumentStatus';
