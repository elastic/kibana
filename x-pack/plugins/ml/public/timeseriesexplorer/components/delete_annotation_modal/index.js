/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

export function DeleteAnnotationModal({
  cancelAction,
  deleteAction,
  isVisible
}) {
  return (
    <React.Fragment>
      {isVisible === true &&
        <EuiOverlayMask>
          <EuiConfirmModal
            title="Delete this annotation?"
            onCancel={cancelAction}
            onConfirm={deleteAction}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            className="eui-textBreakWord"
          />
        </EuiOverlayMask>
      }
    </React.Fragment>
  );
}

DeleteAnnotationModal.propTypes = {
  cancelAction: PropTypes.func.isRequired,
  deleteAction: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired
};
