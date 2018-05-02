/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import PropTypes from 'prop-types';

import React, {
  Component
} from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer
} from '@elastic/eui';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { VALIDATION_STATUS } from '../../../common/constants/validation';
import { getMostSevereMessageStatus } from '../../../common/util/validation_utils';

const defaultIconType = 'questionInCircle';
const getDefaultState = () => ({
  ui: {
    iconType: defaultIconType,
    isLoading: false,
    isModalVisible: false
  },
  data: {
    messages: [],
    success: false
  },
  title: ''
});

const statusToEuiColor = (status) => {
  switch (status) {
    case VALIDATION_STATUS.INFO:
      return 'primary';
      break;
    case VALIDATION_STATUS.ERROR:
      return 'danger';
      break;
    default:
      return status;
  }
};

const statusToEuiIconType = (status) => {
  switch (status) {
    case VALIDATION_STATUS.INFO:
      return 'iInCircle';
      break;
    case VALIDATION_STATUS.ERROR:
      return 'cross';
      break;
    case VALIDATION_STATUS.SUCCESS:
      return 'check';
      break;
    case VALIDATION_STATUS.WARNING:
      return 'alert';
      break;
    default:
      return status;
  }
};

const Link = ({ url }) => (<EuiLink href={url} target="_BLANK">Learn more</EuiLink>);
Link.propTypes = {
  url: PropTypes.string.isRequired
};

// Message is its own component so it can be passed
// as the "title" prop in the Callout component.
const Message = ({ message }) => (
  <React.Fragment>
    {message.text} {message.url && <Link url={message.url} />}
  </React.Fragment>
);
Message.propTypes = {
  message: PropTypes.shape({
    text: PropTypes.string,
    url: PropTypes.string
  })
};

const Callout = ({ message }) => (
  <React.Fragment>
    <EuiCallOut
      color={statusToEuiColor(message.status)}
      size="s"
      title={<Message message={message} />}
      iconType={statusToEuiIconType(message.status)}
    />
    <EuiSpacer size="m" />
  </React.Fragment>
);
Callout.propTypes = {
  message: PropTypes.shape({
    status: PropTypes.string,
    text: PropTypes.string,
    url: PropTypes.string
  })
};

const Modal = ({ close, title, children }) => (
  <EuiOverlayMask>
    <EuiModal
      onClose={close}
      style={{ width: '800px' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {children}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          onClick={close}
          size="s"
          fill
        >
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  </EuiOverlayMask>
);
Modal.propType = {
  close: PropTypes.func.isRequired,
  title: PropTypes.string
};

class ValidateJob extends Component {
  constructor(props) {
    super(props);
    this.state = getDefaultState();
  }

  closeModal = () => {
    const newState = getDefaultState();
    newState.ui.iconType = this.state.ui.iconType;
    this.setState(newState);
  };

  openModal = () => {
    const job = this.props.getJobConfig();
    const getDuration = this.props.getDuration;
    const duration = (typeof getDuration === 'function') ? getDuration() : undefined;
    const fields = this.props.fields;

    if (typeof job === 'object') {
      let shouldShowLoadingIndicator = true;

      this.props.mlJobService
        .validateJob({ duration, fields, job })
        .then((data) => {
          shouldShowLoadingIndicator = false;
          this.setState({
            ...this.state,
            ui: {
              ...this.state.ui,
              iconType: statusToEuiIconType(
                getMostSevereMessageStatus(data.messages)
              ),
              isLoading: false,
              isModalVisible: true
            },
            data,
            title: job.job_id
          });
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
              isModalVisible: false
            }
          });
        }
      }, delay);
    }
  };

  render() {
    // only set to false if really false and not another falsy value, so it defaults to true.
    const fill = (this.props.fill === false) ? false : true;
    // default to false if not explicitly set to true
    const isCurrentJobConfig = (this.props.isCurrentJobConfig !== true) ? false : true;
    const isDisabled = (this.props.isDisabled !== true) ? false : true;


    return (
      <div>
        <EuiButton
          onClick={this.openModal}
          size="s"
          fill={fill}
          iconType={isCurrentJobConfig ? this.state.ui.iconType : defaultIconType}
          iconSide="right"
          isDisabled={isDisabled}
          isLoading={this.state.ui.isLoading}
        >
          Validate Job
        </EuiButton>

        {!isDisabled && this.state.ui.isModalVisible &&
          <Modal
            close={this.closeModal}
            title={`Validate job ${this.state.title}`}
          >
            {this.state.data.messages.map(
              (m, i) => <Callout key={`${m.id}_${i}`} message={m} />
            )}
          </Modal>
        }
      </div>
    );
  }
}
ValidateJob.propTypes = {
  fields: PropTypes.object,
  fill: PropTypes.bool,
  getDuration: PropTypes.func,
  getJobConfig: PropTypes.func.isRequired,
  isCurrentJobConfig: PropTypes.bool,
  isDisabled: PropTypes.bool,
  mlJobService: PropTypes.object.isRequired
};

export { ValidateJob };
