/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiText,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';
import { SyncSavedObjectResponse, SyncResult } from '../../../../../common/types/saved_objects';

import { useToastNotificationService } from '../../../services/toast_notification_service';
import { useMlApiContext } from '../../../contexts/kibana';
import { SelectedModel } from './selected_model';
// import { ModelItem } from '../models_list';

interface Props {
  model: estypes.MlTrainedModelConfig;
  onClose: () => void;
}
export const TestTrainedModelFlyout: FC<Props> = ({ model, onClose }) => {
  // const { displayErrorToast, displaySuccessToast } = useToastNotificationService();
  const [loading, setLoading] = useState(false);

  const {
    trainedModels: { inferTrainedModel },
  } = useMlApiContext();

  useEffect(() => {
    // loadSyncList();
  }, []);

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose} data-test-subj="mlJobMgmtSyncFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.trainedModels.testSavedObjectsFlyout.headerLabel"
                defaultMessage="Test trained model"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {/* <EuiCallOut color="primary">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.trainedModels.testSavedObjectsFlyout.description"
                defaultMessage="Synchronize the saved objects if they are out of sync with the machine learning jobs in Elasticsearch."
              />
            </EuiText>
          </EuiCallOut> */}
          <EuiSpacer />
          <SelectedModel model={model} />
          {/* <SyncList syncItems={syncResp} /> */}
        </EuiFlyoutBody>
        {/* <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={onClose}
                flush="left"
                data-test-subj="mlJobMgmtSyncFlyoutCloseButton"
              >
                <FormattedMessage
                  id="xpack.ml.trainedModels.testSavedObjectsFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={sync}
                fill
                isDisabled={canSync === false || loading === true}
                data-test-subj="mlJobMgmtSyncFlyoutSyncButton"
              >
                <FormattedMessage
                  id="xpack.ml.trainedModels.testSavedObjectsFlyout.syncButton"
                  defaultMessage="Synchronize"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter> */}
      </EuiFlyout>
    </>
  );
};

function getResponseCounts(resp: SyncSavedObjectResponse) {
  let successCount = 0;
  let errorCount = 0;
  Object.values(resp).forEach((result: SyncResult) => {
    Object.values(result).forEach((type) => {
      Object.values(type).forEach(({ success, error }) => {
        if (success === true) {
          successCount++;
        } else if (error !== undefined) {
          errorCount++;
        }
      });
    });
  });
  return { successCount, errorCount };
}
