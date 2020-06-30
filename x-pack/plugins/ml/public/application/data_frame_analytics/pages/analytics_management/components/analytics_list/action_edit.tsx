/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty } from '@elastic/eui'; // EuiToolTip

import {
  checkPermission,
  // createPermissionFailureMessage,
} from '../../../../../capabilities/check_capabilities';
import { DataFrameAnalyticsListRow } from './common';

import { EditAnalyticsFlyout } from './edit_analytics_flyout';

interface EditActionProps {
  item: DataFrameAnalyticsListRow;
}

export const EditAction: FC<EditActionProps> = ({ item }) => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  const buttonEditText = i18n.translate('xpack.ml.dataframe.analyticsList.editActionName', {
    defaultMessage: 'Edit',
  });

  const editButton = (
    <EuiButtonEmpty
      data-test-subj="mlAnalyticsJobEditButton"
      size="xs"
      color="text"
      disabled={!canCreateDataFrameAnalytics}
      iconType="copy"
      onClick={showFlyout}
      aria-label={buttonEditText}
    >
      {buttonEditText}
    </EuiButtonEmpty>
  );

  // if (!canCreateDataFrameAnalytics) {
  //   const content = createCapabilityFailureMessage('canCreateDataFrameAnalytics');

  //   return (
  //     <EuiToolTip position="top" content={content}>
  //       {editButton}
  //     </EuiToolTip>
  //   );
  // }

  return (
    <>
      {editButton}
      {isFlyoutVisible && <EditAnalyticsFlyout closeFlyout={closeFlyout} item={item} />}
    </>
  );
};
