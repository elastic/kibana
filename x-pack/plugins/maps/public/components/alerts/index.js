/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { CreateAlert as CreateAlertView } from './create_alert';
import { getFlyoutDisplay } from '../../selectors/ui_selectors';
import {FLYOUT_STATE} from "../../reducers/ui";
import {updateFlyout} from "../../actions";

function mapStateToProps(state = {}) {
  return {
    flyoutVisible: getFlyoutDisplay(state) === FLYOUT_STATE.ALERTS_PANEL
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setFlyoutVisible: (boolVisible) => {
      boolVisible
        ? dispatch(updateFlyout(FLYOUT_STATE.ALERTS_PANEL))
        : dispatch(updateFlyout(FLYOUT_STATE.NONE))
    }
  };
}

export const CreateAlert = connect(mapStateToProps, mapDispatchToProps)(CreateAlertView);
