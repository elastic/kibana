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
import { ConfirmWatchesModal } from '../../../components/confirm_watches_modal';
import { saveWatch } from '../json_watch_edit_actions';
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
  const [modal, setModal] = useState<{ message: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>(WATCH_TAB_ID_EDIT);
  return (
    <EuiPageContent>
      <ConfirmWatchesModal
        modalOptions={modal}
        callback={async isConfirmed => {
          if (isConfirmed) {
            saveWatch(watch, kbnUrl, licenseService);
          }
          setModal(null);
        }}
      />
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
      {selectedTab === WATCH_TAB_ID_SIMULATE && <JsonWatchEditSimulate />}
      {selectedTab === WATCH_TAB_ID_EDIT && (
        <JsonWatchEditForm
          kbnUrl={kbnUrl}
          licenseService={licenseService}
          setModal={(options: { message: string }) => setModal(options)}
        />
      )}
    </EuiPageContent>
  );
};

export const JsonWatchEdit = injectI18n(JsonWatchEditUi);
