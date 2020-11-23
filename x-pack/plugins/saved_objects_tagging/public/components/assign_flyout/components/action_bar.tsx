/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface AssignFlyoutActionBarProps {
  resultCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const AssignFlyoutActionBar: FC<AssignFlyoutActionBarProps> = ({
  resultCount,
  onSelectAll,
  onDeselectAll,
}) => {
  return (
    <div className="tagAssignFlyout__actionBar">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.savedObjectsTagging.assignFlyout.actionBar.totalResultsLabel"
              defaultMessage="{count, plural, one {1 saved object} other {# saved objects}}"
              values={{
                count: resultCount,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={true}> </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <EuiLink onClick={onSelectAll} data-test-subj="assignFlyout-contextMenuButton">
              <FormattedMessage
                id="xpack.savedObjectsTagging.assignFlyout.actionBar.selectedAllLabel"
                defaultMessage="Select all"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <EuiLink onClick={onDeselectAll} data-test-subj="assignFlyout-contextMenuButton">
              <FormattedMessage
                id="xpack.savedObjectsTagging.assignFlyout.actionBar.deselectedAllLabel"
                defaultMessage="Deselect all"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
