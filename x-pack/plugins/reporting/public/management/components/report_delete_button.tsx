/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, PureComponent } from 'react';
import { Job } from '@kbn/reporting-public';

type DeleteFn = () => Promise<void>;

interface Props {
  jobsToDelete: Job[];
  performDelete: DeleteFn;
}

interface State {
  isDeleting: boolean;
  showConfirm: boolean;
}

export class ReportDeleteButton extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isDeleting: false, showConfirm: false };
  }

  private hideConfirm() {
    this.setState({ showConfirm: false });
  }

  private showConfirm() {
    this.setState({ showConfirm: true });
  }

  private performDelete() {
    this.setState({ isDeleting: true });
    this.props
      .performDelete()
      .then(() => {
        this.setState({ isDeleting: false });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        this.setState({ isDeleting: false });
      });
  }

  private renderConfirm() {
    const { jobsToDelete } = this.props;

    const title =
      jobsToDelete.length > 1
        ? i18n.translate('xpack.reporting.listing.table.deleteNumConfirmTitle', {
            defaultMessage: `Delete the {num} selected reports?`,
            values: { num: jobsToDelete.length },
          })
        : i18n.translate('xpack.reporting.listing.table.deleteConfirmTitle', {
            defaultMessage: `Delete the "{name}" report?`,
            values: { name: jobsToDelete[0].title },
          });
    const message = i18n.translate('xpack.reporting.listing.table.deleteConfirmMessage', {
      defaultMessage: `You can't recover deleted reports.`,
    });
    const confirmButtonText = i18n.translate('xpack.reporting.listing.table.deleteConfirmButton', {
      defaultMessage: `Delete`,
    });
    const cancelButtonText = i18n.translate('xpack.reporting.listing.table.deleteCancelButton', {
      defaultMessage: `Cancel`,
    });

    return (
      <EuiConfirmModal
        title={title}
        onCancel={() => this.hideConfirm()}
        onConfirm={() => this.performDelete()}
        confirmButtonText={confirmButtonText}
        confirmButtonDisabled={this.state.isDeleting}
        cancelButtonText={cancelButtonText}
        defaultFocusedButton="confirm"
        buttonColor="danger"
        data-test-subj="deleteReportConfirm"
      >
        {message}
      </EuiConfirmModal>
    );
  }

  public render() {
    const { jobsToDelete } = this.props;
    if (jobsToDelete.length === 0) return null;

    return (
      <Fragment>
        <EuiButton
          onClick={() => this.showConfirm()}
          iconType="trash"
          color={'danger'}
          data-test-subj="deleteReportButton"
          disabled={this.state.showConfirm}
        >
          {i18n.translate('xpack.reporting.listing.table.deleteReportButton', {
            defaultMessage: `Delete {num, plural, one {report} other {reports} }`,
            values: { num: jobsToDelete.length },
          })}
        </EuiButton>
        {this.state.showConfirm ? this.renderConfirm() : null}
      </Fragment>
    );
  }
}
