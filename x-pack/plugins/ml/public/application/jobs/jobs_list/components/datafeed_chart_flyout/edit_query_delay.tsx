/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';

import { useMlApiContext } from '../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { Datafeed } from '../../../../../../common/types/anomaly_detection_jobs';

const tooltipContent = i18n.translate(
  'xpack.ml.jobsList.datafeedChart.editQueryDelay.tooltipContent',
  {
    defaultMessage:
      'To edit the query delay, you must have permission to edit the datafeed and the datafeed cannot be running.',
  }
);

export const EditQueryDelay: FC<{
  datafeedId: Datafeed['datafeed_id'];
  queryDelay: Datafeed['query_delay'];
  isEnabled: boolean;
}> = ({ datafeedId, queryDelay, isEnabled }) => {
  const [newQueryDelay, setNewQueryDelay] = useState<string | undefined>();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { updateDatafeed } = useMlApiContext();
  const { displaySuccessToast, displayErrorToast } = useToastNotificationService();

  const updateQueryDelay = useCallback(async () => {
    try {
      await updateDatafeed({
        datafeedId,
        datafeedConfig: { query_delay: newQueryDelay },
      });
      displaySuccessToast(
        i18n.translate(
          'xpack.ml.jobsList.datafeedChart.editQueryDelay.changesSavedNotificationMessage',
          {
            defaultMessage: 'Changes to query delay for {datafeedId} saved',
            values: {
              datafeedId,
            },
          }
        )
      );
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate(
          'xpack.ml.jobsList.datafeedChart.editQueryDelay.changesNotSavedNotificationMessage',
          {
            defaultMessage: 'Could not save changes to query delay for {datafeedId}',
            values: {
              datafeedId,
            },
          }
        )
      );
    }
    setIsEditing(false);
  }, [datafeedId, newQueryDelay]);

  const editButton = (
    <EuiButtonEmpty
      color="primary"
      size="xs"
      isDisabled={isEnabled === false}
      onClick={() => {
        setIsEditing(true);
      }}
      iconType="pencil"
    >
      <FormattedMessage
        id="xpack.ml.jobsList.datafeedChart.queryDelayLinkLabel"
        defaultMessage="Query delay: {queryDelay}"
        values={{ queryDelay: newQueryDelay || queryDelay }}
      />
    </EuiButtonEmpty>
  );

  const editButtonWithTooltip = <EuiToolTip content={tooltipContent}>{editButton}</EuiToolTip>;

  return (
    <>
      {isEditing === false ? (isEnabled === false ? editButtonWithTooltip : editButton) : null}
      {isEditing === true ? (
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.jobsList.datafeedChart.queryDelayLabel"
              defaultMessage="Query delay"
            />
          }
        >
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFieldText
                value={newQueryDelay || queryDelay}
                placeholder={queryDelay}
                onChange={(e) => {
                  setNewQueryDelay(e.target.value);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="none" direction="column">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="primary" size="xs" onClick={updateQueryDelay}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.datafeedChart.applyQueryDelayLabel"
                      defaultMessage="Apply"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="text" size="xs" onClick={() => setIsEditing(false)}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.datafeedChart.cancelQueryDelayUpdateLabel"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
    </>
  );
};
