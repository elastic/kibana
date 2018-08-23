/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

class ConfirmDeleteModalUi extends Component {
  static propTypes = {
    isSingleSelection: PropTypes.bool.isRequired,
    entity: PropTypes.string.isRequired,
    jobs: PropTypes.array.isRequired,
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
  }

  renderJobs() {
    const { jobs } = this.props;
    const jobItems = jobs.map(({ id, status }) => {
      const statusText = status === 'started' ? ' (started)' : null;
      return <li key={id}>{id}{statusText}</li>;
    });

    return <ul>{jobItems}</ul>;
  }

  render() {
    const {
      isSingleSelection,
      entity,
      jobs,
      onCancel,
      onConfirm,
      intl,
    } = this.props;

    let title;
    let content;

    if (isSingleSelection) {
      const { id, status } = jobs[0];
      title = intl.formatMessage({
        id: 'xpack.rollupJobs.jobActionMenu.deleteJob.confirmModal.modalTitleSingle',
        defaultMessage: 'Delete rollup job \'{id}\'?',
      }, { id });

      if (status === 'started') {
        content = (
          <p>
            <FormattedMessage
              id="xpack.rollupJobs.jobActionMenu.deleteJob.deleteDescriptionSingleRunning"
              defaultMessage="This job has been started."
            />
          </p>
        );
      }
    } else {
      title = intl.formatMessage({
        id: 'xpack.rollupJobs.jobActionMenu.deleteJob.confirmModal.modalTitleMultiple',
        defaultMessage: 'Delete {count} rollup jobs?',
      }, { count: jobs.length });

      content = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.rollupJobs.jobActionMenu.deleteJob.deleteDescriptionMultiple"
              defaultMessage="You are about to delete {mergedKeyword}"
              values={{ mergedKeyword: isSingleSelection ? 'this' : 'these' }}
            />
            {' '}
            {entity}:
          </p>
          {this.renderJobs()}
        </Fragment>
      );
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={onConfirm}
          cancelButtonText={
            intl.formatMessage({
              id: 'xpack.rollupJobs.jobActionMenu.deleteJob.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          buttonColor="danger"
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.rollupJobs.jobActionMenu.deleteJob.confirmModal.confirmButtonText',
              defaultMessage: 'Delete',
            })
          }
        >
          {content}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}

export const ConfirmDeleteModal = injectI18n(ConfirmDeleteModalUi);
