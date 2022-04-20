/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';

interface Props {
  setIsIdSelectorFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedId?: string;
}

export const AnalyticsIdSelectorControls: FC<Props> = ({
  setIsIdSelectorFlyoutVisible,
  selectedId,
}) => (
  <>
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        {selectedId ? (
          <EuiBadge
            key={`${selectedId}-id`}
            data-test-subj={`mlAnalyticsIdSelectionBadge ${selectedId}`}
            color="hollow"
          >
            {selectedId}
          </EuiBadge>
        ) : null}
        {!selectedId ? (
          <EuiText size={'xs'}>
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.noIdsSelectedLabel"
              defaultMessage="No Analytics ID selected"
            />
          </EuiText>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="pencil"
          onClick={setIsIdSelectorFlyoutVisible.bind(null, true)}
          data-test-subj="mlButtonEditAnalyticsIdSelection"
        >
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.editSelection"
            defaultMessage="Edit selection"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiHorizontalRule />
  </>
);
