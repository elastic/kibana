/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FLYOUT_ARIA_LABEL_ID } from '../constants';
import { Errors } from '../creation_response_components';
import { DocumentCreationLogic, ActiveJsonTab } from '../index';

import {
  PasteJsonTextTabContent,
  UploadJsonFileTabContent,
  PasteJsonTextFooterContent,
  UploadJsonFileFooterContent,
} from './';

import './json_flyout.scss';

export const JsonFlyout: React.FC = () => {
  const { activeJsonTab } = useValues(DocumentCreationLogic);
  const { setActiveJsonTab } = useActions(DocumentCreationLogic);

  const tabs = [
    {
      id: 'uploadTab',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.jsonFlyout.uploadTabName',
        {
          defaultMessage: 'Upload',
        }
      ),
      content: <UploadJsonFileTabContent />,
    },
    {
      id: 'pasteTab',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.jsonFlyout.pasteTabName',
        {
          defaultMessage: 'Paste',
        }
      ),
      content: <PasteJsonTextTabContent />,
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder className="enterpriseSearchTabbedFlyoutHeader">
        <EuiTitle size="m">
          <h2 id={FLYOUT_ARIA_LABEL_ID}>
            {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.jsonFlyout.title', {
              defaultMessage: 'Paste or upload JSON',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiTabs bottomBorder={false}>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => setActiveJsonTab(tab.id as ActiveJsonTab)}
              isSelected={tab.id === activeJsonTab}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody banner={<Errors />}>
        {tabs.find((tab) => tab.id === activeJsonTab)?.content}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {activeJsonTab === 'uploadTab' ? (
          <UploadJsonFileFooterContent />
        ) : (
          <PasteJsonTextFooterContent />
        )}
      </EuiFlyoutFooter>
    </>
  );
};
