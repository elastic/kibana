/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import {
  DISPLAY_SETTINGS_RESULT_DETAIL_PATH,
  DISPLAY_SETTINGS_SEARCH_RESULT_PATH,
  getContentSourcePath,
} from '../../../../routes';

import { clearFlashMessages } from '../../../../../shared/flash_messages';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';

import { Loading } from '../../../../../shared/loading';
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

import { DisplaySettingsLogic } from './display_settings_logic';

import { FieldEditorModal } from './field_editor_modal';
import { ResultDetail } from './result_detail';
import { SearchResults } from './search_results';

interface DisplaySettingsProps {
  tabId: number;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ tabId }) => {
  const { initializeDisplaySettings, setServerData } = useActions(DisplaySettingsLogic);

  const {
    dataLoading,
    sourceId,
    addFieldModalVisible,
    unsavedChanges,
    exampleDocuments,
  } = useValues(DisplaySettingsLogic);

  const { isOrganization } = useValues(AppLogic);

  const hasDocuments = exampleDocuments.length > 0;

  useEffect(() => {
    initializeDisplaySettings();
    return clearFlashMessages;
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
    const path =
      tab.id === tabs[1].id
        ? getContentSourcePath(DISPLAY_SETTINGS_RESULT_DETAIL_PATH, sourceId, isOrganization)
        : getContentSourcePath(DISPLAY_SETTINGS_SEARCH_RESULT_PATH, sourceId, isOrganization);

    KibanaLogic.values.navigateToUrl(path);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setServerData();
  };

  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <ViewContentHeader
          title={DISPLAY_SETTINGS_TITLE}
          description={DISPLAY_SETTINGS_DESCRIPTION}
          action={
            hasDocuments ? (
              <EuiButton type="submit" disabled={!unsavedChanges} fill={true}>
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
          <EuiPanel className="euiPanel--inset">
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
