/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { History } from 'history';
import { useActions, useValues } from 'kea';
import { useHistory } from 'react-router-dom';

import { EuiButton, EuiEmptyPrompt, EuiTabbedContent, EuiPanel } from '@elastic/eui';

import FlashMessages from 'shared/components/FlashMessages';
import {
  DISPLAY_SETTINGS_RESULT_DETAIL_PATH,
  DISPLAY_SETTINGS_SEARCH_RESULT_PATH,
  getContentSourcePath,
} from '../../../../routes';

import { AppLogic } from '../../../../app_logic';

import { Loading } from '../../../../../shared/loading';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { DisplaySettingsLogic } from './display_settings_logic';

import { FieldEditorModal } from './field_editor_modal';
import { ResultDetail } from './result_detail';
import { SearchResults } from './search_results';

const UNSAVED_MESSAGE =
  'Your display settings have not been saved. Are you sure you want to leave?';

interface DisplaySettingsProps {
  tabId: number;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ tabId }) => {
  const history = useHistory() as History;
  const { initializeDisplaySettings, setServerData, resetDisplaySettingsState } = useActions(
    DisplaySettingsLogic
  );

  const {
    dataLoading,
    flashMessages,
    sourceId,
    addFieldModalVisible,
    unsavedChanges,
    exampleDocuments,
  } = useValues(DisplaySettingsLogic);

  const { isOrganization } = useValues(AppLogic);

  const hasDocuments = exampleDocuments.length > 0;

  useEffect(() => {
    initializeDisplaySettings();
    return resetDisplaySettingsState;
  }, []);

  useEffect(() => {
    window.onbeforeunload = hasDocuments && unsavedChanges ? () => UNSAVED_MESSAGE : null;
    return () => {
      window.onbeforeunload = null;
    };
  }, [unsavedChanges]);

  if (dataLoading) return <Loading />;

  const tabs = [
    {
      id: 'search_results',
      name: 'Search Results',
      disabled: false,
      content: <SearchResults />,
    },
    {
      id: 'result_detail',
      name: 'Result Detail',
      disabled: false,
      content: <ResultDetail />,
    },
  ];

  const onSelectedTabChanged = (tab) => {
    const path =
      tab.id === tabs[1].id
        ? getContentSourcePath(DISPLAY_SETTINGS_RESULT_DETAIL_PATH, sourceId, isOrganization)
        : getContentSourcePath(DISPLAY_SETTINGS_SEARCH_RESULT_PATH, sourceId, isOrganization);

    history.push(path);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setServerData();
  };

  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <ViewContentHeader
          title="Display Settings"
          description="Customize the content and appearance of your Custom API Source search results."
          action={
            hasDocuments ? (
              <EuiButton type="submit" disabled={!unsavedChanges} fill={true}>
                Save
              </EuiButton>
            ) : null
          }
        />
        {!!flashMessages && <FlashMessages {...flashMessages} />}
        {hasDocuments ? (
          <EuiTabbedContent
            tabs={tabs}
            selectedTab={tabs[tabId]}
            onTabClick={onSelectedTabChanged}
          />
        ) : (
          <EuiPanel className="euiPanel--inset">
            <EuiEmptyPrompt
              iconType="indexRollupApp"
              title={<h2>You have no content yet</h2>}
              body={
                <p>You need some content to display in order to configure the display settings.</p>
              }
            />
          </EuiPanel>
        )}
      </form>
      {addFieldModalVisible && <FieldEditorModal />}
    </>
  );
};
