/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useState, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
} from '@elastic/eui';

import { JobCreatorContext } from '../../job_creator_context';
import { DatafeedPreview } from './datafeed_preview';

export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  isDisabled: boolean;
}
export const DatafeedPreviewFlyout: FC<Props> = ({ isDisabled }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const [showFlyout, setShowFlyout] = useState(false);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  return (
    <Fragment>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="m">
          <EuiFlyoutBody>
            <DatafeedPreview
              combinedJob={{
                ...jobCreator.jobConfig,
                datafeed_config: jobCreator.datafeedConfig,
              }}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={() => setShowFlyout(false)} flush="left">
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void }> = ({ isDisabled, onClick }) => {
  return (
    <EuiButtonEmpty
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobWizardButtonPreviewJobJson"
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
        defaultMessage="Datafeed preview"
      />
    </EuiButtonEmpty>
  );
};
