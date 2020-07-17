/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import {
  AlertsContextProvider,
  AlertAdd,
} from '../../../../triggers_actions_ui/public';
import { ALERTING_EXAMPLE_APP_ID } from '../../../common/constants';
import {
  getData,
  getDocLinks,
  getHttp,
  getToasts,
  getUiSettings,
  getCapabilities,
  getTriggersActionsUi,
} from "../../kibana_services";
import {updateFlyout} from "../../actions";
import {FLYOUT_STATE} from "../../reducers/ui";
// @ts-expect-error
import {getStore} from "../../routing/store_operations";
import { setAlertMenuAction } from '../../components/alerts/alerts_top_nav_handling';

setAlertMenuAction(
  () => getStore().dispatch(updateFlyout(FLYOUT_STATE.ALERTS_PANEL))
);

export const CreateAlert = ({ flyoutVisible, setFlyoutVisible }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AlertsContextProvider
          value={{
            http: getHttp(),
            actionTypeRegistry: getTriggersActionsUi().actionTypeRegistry,
            alertTypeRegistry: getTriggersActionsUi().alertTypeRegistry,
            toastNotifications: getToasts(),
            uiSettings: getUiSettings(),
            docLinks: getDocLinks(),
            // charts,
            dataFieldsFormats: getData().fieldFormats,
            capabilities: getCapabilities(),
          }}
        >
          <AlertAdd
            consumer={ALERTING_EXAMPLE_APP_ID}
            addFlyoutVisible={flyoutVisible}
            setAddFlyoutVisibility={setFlyoutVisible}
          />
        </AlertsContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
