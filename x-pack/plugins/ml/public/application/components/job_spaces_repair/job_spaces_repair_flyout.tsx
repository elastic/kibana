/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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

import { ml } from '../../services/ml_api_service';
import { RepairSavedObjectResponse } from '../../../../common/types/saved_objects';
import { RepairList } from './repair_results';

interface Props {
  onClose: () => void;
}
export const JobSpacesRepairFlyout: FC<Props> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [repairable, setRepairable] = useState(false);
  const [repairResp, setRepairResp] = useState<RepairSavedObjectResponse | null>(null);

  async function loadRepairList(simulate: boolean = true) {
    setLoading(true);
    const resp = await ml.savedObjects.repairSavedObjects(simulate);
    setRepairResp(resp);

    const count = Object.values(resp).reduce((acc, cur) => acc + Object.keys(cur).length, 0);
    setRepairable(count > 0);
    setLoading(false);
  }

  useEffect(() => {
    loadRepairList();
  }, []);

  async function repair() {
    if (repairable) {
      await loadRepairList(false);
      await loadRepairList(true);
    }
  }

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.management.repairSavedObjectsFlyout.headerLabel"
                defaultMessage="Repair job saved objects"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut color="primary">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.management.repairSavedObjectsFlyout.description"
                defaultMessage="Repair the ML job saved objects in case they become out of sync with the jobs in elasticsearch."
              />
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
          <RepairList repairItems={repairResp} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.ml.management.repairSavedObjectsFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={repair}
                fill
                isDisabled={repairable === false || loading === true}
              >
                <FormattedMessage
                  id="xpack.ml.management.repairSavedObjectsFlyout.repairButton"
                  defaultMessage="Repair"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
