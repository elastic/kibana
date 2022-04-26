/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { getDocLinks } from '../../util/dependency_cache';

import { parseMessages } from '../../../../common/constants/messages';
import { VALIDATION_STATUS } from '../../../../common/constants/validation';
import { Callout, statusToEuiIconType } from '../callout';
import { getMostSevereMessageStatus } from '../../../../common/util/validation_utils';
import { toastNotificationServiceProvider } from '../../services/toast_notification_service';
import { withKibana } from '@kbn/kibana-react-plugin/public';

const defaultIconType = 'questionInCircle';
const getDefaultState = () => ({
  ui: {
    iconType: defaultIconType,
    isLoading: true,
    isModalVisible: false,
  },
  data: {
    messages: [],
    success: false,
  },
  title: '',
});

const MessageList = ({ messages, idFilterList }) => {
  const callouts = messages
    .filter((m) => idFilterList.includes(m.id) === false)
    .map((m, i) => <Callout key={`${m.id}_${i}`} {...m} />);

  // there could be no error or success messages due to the
  // idFilterList being applied. so rather than showing nothing,
  // show a message saying all passed
  const allPassedCallout = (
    <Callout
      text={i18n.translate('xpack.ml.validateJob.allPassed', {
        defaultMessage: 'All validation checks passed successfully',
      })}
      status={VALIDATION_STATUS.SUCCESS}
    />
  );

  return <React.Fragment>{callouts.length ? callouts : allPassedCallout}</React.Fragment>;
};
MessageList.propTypes = {
  messages: PropTypes.array,
  idFilterList: PropTypes.array,
};

const LoadingSpinner = () => (
  <EuiFlexGroup justifyContent="spaceAround" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const Modal = ({ close, title, children }) => (
  <EuiModal onClose={close} style={{ width: '800px' }}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
    </EuiModalHeader>

    <EuiModalBody>{children}</EuiModalBody>

    <EuiModalFooter>
      <EuiButton onClick={close} size="s" fill>
        <FormattedMessage id="xpack.ml.validateJob.modal.closeButtonLabel" defaultMessage="Close" />
      </EuiButton>
    </EuiModalFooter>
  </EuiModal>
);
Modal.propType = {
  close: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export class ValidateJobUI extends Component {
  constructor(props) {
    super(props);
    this.state = getDefaultState();
  }

  componentDidMount() {
    if (this.props.embedded === true) {
      this.validate();
    }
  }

  closeModal = () => {
    const newState = getDefaultState();
    newState.ui.iconType = this.state.ui.iconType;
    this.setState(newState);
  };

  validate = () => {
    const job = this.props.getJobConfig();
    const getDuration = this.props.getDuration;
    const duration = typeof getDuration === 'function' ? getDuration() : undefined;
    const fields = this.props.fields;

    // Run job validation only if a job config has been passed on and the duration makes sense to run it.
    // Otherwise we skip the call and display a generic warning, but let the user move on to the next wizard step.
    if (typeof job === 'object') {
      if (typeof duration === 'object' && duration.start !== null && duration.end !== null) {
        let shouldShowLoadingIndicator = true;

        this.props.ml
          .validateJob({ duration, fields, job })
          .then((validationMessages) => {
            const messages = parseMessages(validationMessages, getDocLinks());
            shouldShowLoadingIndicator = false;

            const messagesContainError = messages.some((m) => m.status === VALIDATION_STATUS.ERROR);

            if (messagesContainError) {
              messages.push({
                id: 'job_validation_includes_error',
                text: i18n.translate('xpack.ml.validateJob.jobValidationIncludesErrorText', {
                  defaultMessage:
                    'Job validation has failed, but you can still continue and create the job. Please be aware the job may encounter problems when running.',
                }),
                status: VALIDATION_STATUS.WARNING,
              });
            }

            this.setState({
              ...this.state,
              ui: {
                ...this.state.ui,
                iconType: statusToEuiIconType(getMostSevereMessageStatus(messages)),
                isLoading: false,
                isModalVisible: true,
              },
              data: {
                messages,
                success: true,
              },
              title: job.job_id,
            });
            if (typeof this.props.setIsValid === 'function') {
              this.props.setIsValid(!messagesContainError);
            }
          })
          .catch((error) => {
            const { toasts } = this.props.kibana.services.notifications;
            const toastNotificationService = toastNotificationServiceProvider(toasts);
            toastNotificationService.displayErrorToast(
              error,
              i18n.translate('xpack.ml.jobService.validateJobErrorTitle', {
                defaultMessage: 'Job Validation Error',
              })
            );
          });

        // wait for 250ms before triggering the loading indicator
        // to avoid flickering when there's a loading time below
        // 250ms for the job validation data
        const delay = 250;
        setTimeout(() => {
          if (shouldShowLoadingIndicator) {
            this.setState({
              ...this.state,
              ui: {
                ...this.state.ui,
                isLoading: true,
                isModalVisible: false,
              },
            });
          }
        }, delay);
      } else {
        this.setState({
          ...this.state,
          ui: {
            ...this.state.ui,
            iconType: statusToEuiIconType(VALIDATION_STATUS.WARNING),
            isLoading: false,
            isModalVisible: true,
          },
          data: {
            messages: [
              {
                id: 'job_validation_skipped',
                text: i18n.translate('xpack.ml.validateJob.jobValidationSkippedText', {
                  defaultMessage:
                    'Job validation could not be run because of insufficient sample data. Please be aware the job may encounter problems when running.',
                }),
                status: VALIDATION_STATUS.WARNING,
              },
            ],
            success: true,
          },
          title: job.job_id,
        });
        if (typeof this.props.setIsValid === 'function') {
          this.props.setIsValid(true);
        }
      }
    }
  };

  render() {
    const jobTipsUrl = getDocLinks().links.ml.anomalyDetectionJobTips;
    // only set to false if really false and not another falsy value, so it defaults to true.
    const fill = this.props.fill === false ? false : true;
    // default to false if not explicitly set to true
    const isCurrentJobConfig = this.props.isCurrentJobConfig !== true ? false : true;
    const isDisabled = this.props.isDisabled !== true ? false : true;
    const embedded = this.props.embedded === true;
    const idFilterList = this.props.idFilterList || [];
    const isLoading = this.state.ui.isLoading;

    return (
      <Fragment>
        {embedded === false ? (
          <div>
            <EuiButton
              onClick={this.validate}
              size="s"
              fill={fill}
              iconType={isCurrentJobConfig ? this.state.ui.iconType : defaultIconType}
              iconSide="right"
              isDisabled={isDisabled}
              isLoading={isLoading}
            >
              <FormattedMessage
                id="xpack.ml.validateJob.validateJobButtonLabel"
                defaultMessage="Validate Job"
              />
            </EuiButton>

            {!isDisabled && this.state.ui.isModalVisible && (
              <Modal
                close={this.closeModal}
                title={
                  <FormattedMessage
                    id="xpack.ml.validateJob.modal.validateJobTitle"
                    defaultMessage="Validate job {title}"
                    values={{ title: this.state.title }}
                  />
                }
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <MessageList messages={this.state.data.messages} idFilterList={idFilterList} />
                )}

                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.validateJob.modal.jobValidationDescriptionText"
                    defaultMessage="Job validation performs certain checks against job configurations and underlying source data
                    and provides specific advice on how to adjust settings that are more likely to produce insightful results."
                  />
                </EuiText>
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.validateJob.modal.linkToJobTipsText"
                    defaultMessage="For more information, see {mlJobTipsLink}."
                    values={{
                      mlJobTipsLink: (
                        <EuiLink href={jobTipsUrl} target="_blank">
                          <FormattedMessage
                            id="xpack.ml.validateJob.modal.linkToJobTipsText.mlJobTipsLinkText"
                            defaultMessage="Machine Learning Job Tips"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </Modal>
            )}
          </div>
        ) : (
          <Fragment>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <MessageList messages={this.state.data.messages} idFilterList={idFilterList} />
            )}
          </Fragment>
        )}
      </Fragment>
    );
  }
}
ValidateJobUI.propTypes = {
  fields: PropTypes.object,
  fill: PropTypes.bool,
  getDuration: PropTypes.func,
  getJobConfig: PropTypes.func.isRequired,
  isCurrentJobConfig: PropTypes.bool,
  isDisabled: PropTypes.bool,
  ml: PropTypes.object.isRequired,
  embedded: PropTypes.bool,
  setIsValid: PropTypes.func,
  idFilterList: PropTypes.array,
};

export const ValidateJob = withKibana(ValidateJobUI);
