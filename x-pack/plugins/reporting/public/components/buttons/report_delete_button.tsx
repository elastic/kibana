/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask, EuiButton } from '@elastic/eui';
import React, { PureComponent, Fragment } from 'react';
import { Job, Props as ListingProps } from '../report_listing';

type DeleteFn = () => Promise<void>;
type Props = { jobsToDelete: Job[]; performDelete: DeleteFn } & ListingProps;
interface State {
  showConfirm: boolean;
}

export class ReportDeleteButton extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { showConfirm: false };
  }

  private hideConfirm() {
    this.setState({ showConfirm: false });
  }

  private showConfirm() {
    this.setState({ showConfirm: true });
  }

  private renderConfirm() {
    const { intl, jobsToDelete } = this.props;

    const title =
      jobsToDelete.length > 1
        ? intl.formatMessage(
            {
              id: 'xpack.reporting.listing.table.deleteNumConfirmTitle',
              defaultMessage: `Delete {num} reports?`,
            },
            { num: jobsToDelete.length }
          )
        : intl.formatMessage(
            {
              id: 'xpack.reporting.listing.table.deleteConfirmTitle',
              defaultMessage: `Delete the "{name}" report?`,
            },
            { name: jobsToDelete[0].object_title }
          );
    const message = intl.formatMessage({
      id: 'xpack.reporting.listing.table.deleteConfirmMessage',
      defaultMessage: `You can't recover deleted reports.`,
    });
    const confirmButtonText = intl.formatMessage({
      id: 'xpack.reporting.listing.table.deleteConfirmButton',
      defaultMessage: `Delete`,
    });
    const cancelButtonText = intl.formatMessage({
      id: 'xpack.reporting.listing.table.deleteCancelButton',
      defaultMessage: `Cancel`,
    });

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={() => this.hideConfirm()}
          onConfirm={() => this.props.performDelete()}
          confirmButtonText={confirmButtonText}
          cancelButtonText={cancelButtonText}
          defaultFocusedButton="confirm"
          buttonColor="danger"
        >
          {message}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  public render() {
    const { jobsToDelete, intl } = this.props;
    if (jobsToDelete.length === 0) return null;

    return (
      <Fragment>
        <EuiButton
          onClick={() => this.showConfirm()}
          iconType="trash"
          color={'danger'}
          data-test-subj="deleteReportButton"
        >
          {intl.formatMessage(
            {
              id: 'xpack.reporting.listing.table.deleteReportButton',
              defaultMessage: `Delete ({num})`,
            },
            { num: jobsToDelete.length }
          )}
        </EuiButton>
        {this.state.showConfirm ? this.renderConfirm() : null}
      </Fragment>
    );
  }
}
