/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
  Fragment
} from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter
} from '@elastic/eui';


export class NewEventModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: 'Single day',
      startTime: undefined,
      endTime: undefined,
    };
  }

  handleAddEvent = (event) => {
    this.props.addEvent(event);
  }

  render() {
    const { closeModal } = this.props;

    const formSample = (
      <EuiForm>
        <EuiFormRow
          label="Description"
        >
          <EuiFieldText name="description" />
        </EuiFormRow>
      </EuiForm>
    );

    return (
      <Fragment>
        <EuiModal
          onClose={closeModal}
          initialFocus="[name=description]"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle >
              Create new event
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            {formSample}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              onClick={this.handleAddEvent}
              fill
            >
              Add
            </EuiButton>
            <EuiButtonEmpty
              onClick={closeModal}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      </Fragment>
    );
  }
}

NewEventModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  addEvent: PropTypes.func.isRequired,
};
