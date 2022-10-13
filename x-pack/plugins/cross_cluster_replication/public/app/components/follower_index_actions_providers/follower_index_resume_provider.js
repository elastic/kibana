/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EuiLink } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { routing } from '../../services/routing';
import { resumeFollowerIndex } from '../../store/actions';
import { arrify } from '../../../../common/services/utils';

class FollowerIndexResumeProviderUi extends PureComponent {
  static propTypes = {
    onConfirm: PropTypes.func,
  };

  state = {
    isModalOpen: false,
    ids: null,
  };

  onMouseOverModal = (event) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  resumeFollowerIndex = (id) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    this.props.resumeFollowerIndex(this.state.ids);
    this.setState({ isModalOpen: false, ids: null });
    this.props.onConfirm && this.props.onConfirm();
  };

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  renderModal = () => {
    const { ids } = this.state;
    const isSingle = ids.length === 1;
    const title = isSingle
      ? i18n.translate(
          'xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.resumeSingleTitle',
          {
            defaultMessage: `Resume replication to follower index '{name}'?`,
            values: { name: ids[0] },
          }
        )
      : i18n.translate(
          'xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.resumeMultipleTitle',
          {
            defaultMessage: `Resume replication to {count} follower indices?`,
            values: { count: ids.length },
          }
        );

    return (
      // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
      <EuiConfirmModal
        title={title}
        onCancel={this.closeConfirmModal}
        onConfirm={this.onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="primary"
        confirmButtonText={i18n.translate(
          'xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Resume replication',
          }
        )}
        onMouseOver={this.onMouseOverModal}
        data-test-subj="resumeReplicationConfirmation"
      >
        {isSingle ? (
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.singleResumeDescription"
              defaultMessage="Replication resumes using the default advanced settings. To use
                  custom advanced settings, {editLink}."
              values={{
                editLink: (
                  <EuiLink
                    {...reactRouterNavigate(
                      routing._reactRouter.history,
                      routing.getFollowerIndexPath(ids[0])
                    )}
                    data-test-subj="editLink"
                  >
                    <FormattedMessage
                      id="xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.singleResumeEditLink"
                      defaultMessage="edit the follower index"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        ) : (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.multipleResumeDescriptionWithSettingWarning"
                defaultMessage="Replication resumes using the default advanced settings."
              />
            </p>

            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.resumeFollowerIndex.confirmModal.multipleResumeDescription"
                defaultMessage="Replication will resume on these follower indices:"
              />
            </p>

            <ul>
              {ids.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </Fragment>
        )}
      </EuiConfirmModal>
    );
  };

  render() {
    const { children } = this.props;
    const { isModalOpen } = this.state;

    return (
      <Fragment>
        {children(this.resumeFollowerIndex)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  resumeFollowerIndex: (id) => dispatch(resumeFollowerIndex(id)),
});

export const FollowerIndexResumeProvider = connect(
  undefined,
  mapDispatchToProps
)(FollowerIndexResumeProviderUi);
