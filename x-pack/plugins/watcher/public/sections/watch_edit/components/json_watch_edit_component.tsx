/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { ExecuteDetails } from 'plugins/watcher/models/execute_details/execute_details';
import { getActionType } from 'x-pack/plugins/watcher/common/lib/get_action_type';
import { BaseWatch, ExecutedWatchDetails } from 'x-pack/plugins/watcher/common/types/watch_types';
import {
  ACTION_MODES,
  TIME_UNITS,
  WATCH_TAB_ID_EDIT,
  WATCH_TAB_ID_SIMULATE,
  WATCH_TABS,
} from '../../../../common/constants';
import { JsonWatchEditForm } from './json_watch_edit_form';
import { JsonWatchEditSimulate } from './json_watch_edit_simulate';
import { WatchContext } from './watch_context';
interface WatchAction {
  actionId: string;
  actionMode: string;
  type: string;
}

interface WatchActions extends Array<WatchAction> {}

const EXECUTE_DETAILS_INITIAL_STATE = {
  triggeredTimeValue: 0,
  triggeredTimeUnit: TIME_UNITS.MILLISECOND,
  scheduledTimeValue: 0,
  scheduledTimeUnit: TIME_UNITS.SECOND,
  ignoreCondition: false,
};

function getActions(watch: BaseWatch) {
  const actions = (watch.watch && watch.watch.actions) || {};
  return Object.keys(actions).map(actionKey => ({
    actionId: actionKey,
    type: getActionType(actions[actionKey]),
    actionMode: ACTION_MODES.SIMULATE,
  }));
}

function getActionModes(items: WatchActions) {
  const result = items.reduce((itemsAccum: any, item) => {
    if (item.actionId) {
      itemsAccum[item && item.actionId] = item.actionMode;
    }
    return itemsAccum;
  }, {});
  return result;
}

const JsonWatchEditUi = ({
  pageTitle,
  urlService,
  licenseService,
}: {
  pageTitle: string;
  urlService: any;
  licenseService: any;
}) => {
  const { watch } = useContext(WatchContext);
  const watchActions = getActions(watch);
  // hooks
  const [selectedTab, setSelectedTab] = useState<string>(WATCH_TAB_ID_EDIT);
  const [watchErrors, setWatchErrors] = useState<{ [key: string]: string[] }>({
    watchId: [],
    watchJson: [],
  });
  const [isShowingWatchErrors, setIsShowingWatchErrors] = useState<boolean>(false);
  const [executeWatchJsonString, setExecuteWatchJsonString] = useState<string>('');
  const [isShowingExecuteWatchErrors, setIsShowingExecuteWatchErrors] = useState<boolean>(false);
  const [executeWatchErrors, setExecuteWatchErrors] = useState<{ [key: string]: string[] }>({
    simulateExecutionInputOverride: [],
  });
  const [executeDetails, setExecuteDetails] = useState(
    new ExecuteDetails({
      ...EXECUTE_DETAILS_INITIAL_STATE,
      actionModes: getActionModes(watchActions),
    })
  );
  // ace editor requires json to be in string format
  const [watchJsonString, setWatchJsonString] = useState<string>(
    JSON.stringify(watch.watch, null, 2)
  );
  return (
    <EuiPageContent>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>{pageTitle}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiTabs>
        {WATCH_TABS.map((tab, index) => (
          <EuiTab
            onClick={() => {
              setSelectedTab(tab.id);
              setExecuteDetails(
                new ExecuteDetails({ ...executeDetails, actionModes: getActionModes(watchActions) })
              );
            }}
            isSelected={tab.id === selectedTab}
            key={index}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === WATCH_TAB_ID_SIMULATE && (
        <JsonWatchEditSimulate
          executeDetails={executeDetails}
          setExecuteDetails={(details: ExecutedWatchDetails) => setExecuteDetails(details)}
          executeWatchJsonString={executeWatchJsonString}
          setExecuteWatchJsonString={(json: string) => setExecuteWatchJsonString(json)}
          errors={executeWatchErrors}
          setErrors={(errors: { [key: string]: string[] }) => setExecuteWatchErrors(errors)}
          isShowingErrors={isShowingExecuteWatchErrors}
          setIsShowingErrors={(isShowingErrors: boolean) =>
            setIsShowingExecuteWatchErrors(isShowingErrors)
          }
          isDisabled={isShowingExecuteWatchErrors || isShowingWatchErrors}
          watchActions={watchActions}
        />
      )}
      {selectedTab === WATCH_TAB_ID_EDIT && (
        <JsonWatchEditForm
          urlService={urlService}
          licenseService={licenseService}
          watchJsonString={watchJsonString}
          setWatchJsonString={(json: string) => setWatchJsonString(json)}
          errors={watchErrors}
          setErrors={(errors: { [key: string]: string[] }) => setWatchErrors(errors)}
          isShowingErrors={isShowingWatchErrors}
          setIsShowingErrors={(isShowingErrors: boolean) =>
            setIsShowingWatchErrors(isShowingErrors)
          }
        />
      )}
    </EuiPageContent>
  );
};

export const JsonWatchEdit = injectI18n(JsonWatchEditUi);
