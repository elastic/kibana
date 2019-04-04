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
import { WATCH_TAB_ID_EDIT, WATCH_TAB_ID_SIMULATE, WATCH_TABS } from '../../../../common/constants';
import { JsonWatchEditForm } from './json_watch_edit_form';
import { JsonWatchEditSimulate } from './json_watch_edit_simulate';
import { WatchContext } from './watch_context';

const JsonWatchEditUi = ({
  pageTitle,
  kbnUrl,
  licenseService,
}: {
  pageTitle: string;
  kbnUrl: any;
  licenseService: any;
}) => {
  const { watch } = useContext(WatchContext);
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
          executeWatchJsonString={executeWatchJsonString}
          setExecuteWatchJsonString={(json: string) => setExecuteWatchJsonString(json)}
          errors={executeWatchErrors}
          setErrors={(errors: { [key: string]: string[] }) => setExecuteWatchErrors(errors)}
          isShowingErrors={isShowingExecuteWatchErrors}
          setIsShowingErrors={(isShowingErrors: boolean) =>
            setIsShowingExecuteWatchErrors(isShowingErrors)
          }
          isDisabled={isShowingExecuteWatchErrors || isShowingWatchErrors}
        />
      )}
      {selectedTab === WATCH_TAB_ID_EDIT && (
        <JsonWatchEditForm
          kbnUrl={kbnUrl}
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
