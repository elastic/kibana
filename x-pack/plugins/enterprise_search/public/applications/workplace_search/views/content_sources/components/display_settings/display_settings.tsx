/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent, useEffect } from 'react';

import { useActions, useValues } from 'kea';

import './display_settings.scss';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiTabbedContent,
  EuiPanel,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { clearFlashMessages } from '../../../../../shared/flash_messages';
import { Loading } from '../../../../../shared/loading';
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { SAVE_BUTTON } from '../../../../constants';

import {
  UNSAVED_MESSAGE,
  DISPLAY_SETTINGS_TITLE,
  DISPLAY_SETTINGS_DESCRIPTION,
  DISPLAY_SETTINGS_EMPTY_TITLE,
  DISPLAY_SETTINGS_EMPTY_BODY,
  SEARCH_RESULTS_LABEL,
  RESULT_DETAIL_LABEL,
} from './constants';
import { DisplaySettingsLogic, TabId } from './display_settings_logic';
import { FieldEditorModal } from './field_editor_modal';
import { ResultDetail } from './result_detail';
import { SearchResults } from './search_results';

interface DisplaySettingsProps {
  tabId: number;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ tabId }) => {
  const { initializeDisplaySettings, setServerData, handleSelectedTabChanged } = useActions(
    DisplaySettingsLogic
  );

  const {
    dataLoading,
    addFieldModalVisible,
    unsavedChanges,
    exampleDocuments,
    navigatingBetweenTabs,
  } = useValues(DisplaySettingsLogic);

  const hasDocuments = exampleDocuments.length > 0;
  const hasUnsavedChanges = hasDocuments && unsavedChanges;

  useEffect(() => {
    initializeDisplaySettings();
    return clearFlashMessages;
  }, []);

  if (dataLoading) return <Loading />;

  const tabs = [
    {
      id: 'search_results',
      name: SEARCH_RESULTS_LABEL,
      content: <SearchResults />,
    },
    {
      id: 'result_detail',
      name: RESULT_DETAIL_LABEL,
      content: <ResultDetail />,
    },
  ] as EuiTabbedContentTab[];

  const onSelectedTabChanged = (tab: EuiTabbedContentTab) => {
    handleSelectedTabChanged(tab.id as TabId);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setServerData();
  };

  return (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={!navigatingBetweenTabs && hasUnsavedChanges}
        messageText={UNSAVED_MESSAGE}
      />
      <form onSubmit={handleFormSubmit}>
        <ViewContentHeader
          title={DISPLAY_SETTINGS_TITLE}
          description={DISPLAY_SETTINGS_DESCRIPTION}
          action={
            hasDocuments ? (
              <EuiButton type="submit" disabled={!unsavedChanges} fill>
                {SAVE_BUTTON}
              </EuiButton>
            ) : null
          }
        />
        {hasDocuments ? (
          <EuiTabbedContent
            tabs={tabs}
            selectedTab={tabs[tabId]}
            onTabClick={onSelectedTabChanged}
          />
        ) : (
          <EuiPanel hasShadow={false} color="subdued">
            <EuiEmptyPrompt
              iconType="indexRollupApp"
              title={<h2>{DISPLAY_SETTINGS_EMPTY_TITLE}</h2>}
              body={<p>{DISPLAY_SETTINGS_EMPTY_BODY}</p>}
            />
          </EuiPanel>
        )}
      </form>
      {addFieldModalVisible && <FieldEditorModal />}
    </>
  );
};
