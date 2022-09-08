/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiForm,
  EuiFieldText,
  EuiFieldPassword,
  EuiButton,
  EuiFormRow,
  EuiTitle,
  EuiCheckableCard,
  EuiFormFieldset,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiConfirmModal,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  SAVE_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
  EDIT_BUTTON_LABEL,
  DELETE_BUTTON_LABEL,
  USERNAME_LABEL,
  PASSWORD_LABEL,
  TYPE_LABEL,
} from '../../../shared/constants';
import { DataPanel } from '../../../shared/data_panel/data_panel';

import {
  AuthenticationPanelLogic,
  BasicCrawlerAuth,
  CrawlerAuth,
  isBasicCrawlerAuth,
  isRawCrawlerAuth,
  RawCrawlerAuth,
} from './authentication_panel_logic';

import './authentication_panel.scss';

const AUTHENTICATION_LABELS = {
  basic: i18n.translate(
    'xpack.enterpriseSearch.crawler.authenticationPanel.basicAuthenticationLabel',
    {
      defaultMessage: 'Basic authentication',
    }
  ),
  raw: i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.rawAuthenticationLabel', {
    defaultMessage: 'Authentication header',
  }),
};

const TOGGLE_VISIBILITY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.crawler.authenticationPanel.toggleVisibilityLabel',
  { defaultMessage: 'Toggle credential visibility' }
);

export const AuthenticationPanel: React.FC = () => {
  const [currentAuth, setCurrentAuth] = useState<CrawlerAuth | undefined>(undefined);

  const {
    disableEditing,
    enableEditing,
    selectAuthOption,
    setHeaderContent,
    setIsModalVisible,
    setPassword,
    setUsername,
    toggleCredentialVisibility,
  } = useActions(AuthenticationPanelLogic);
  const {
    headerContent,
    isEditing,
    isModalVisible,
    username,
    password,
    selectedAuthOption,
    areCredentialsVisible,
  } = useValues(AuthenticationPanelLogic);

  return (
    <>
      <DataPanel
        className="authenticationPanel"
        hasBorder
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.title', {
              defaultMessage: 'Authentiction',
            })}
          </h2>
        }
        action={
          isEditing ? (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButtonEmpty
                  iconType="checkInCircleFilled"
                  size="s"
                  color="primary"
                  onClick={() => {
                    if (selectedAuthOption === 'basic') {
                      setCurrentAuth({
                        password,
                        type: 'basic',
                        username,
                      });
                    } else if (selectedAuthOption === 'raw') {
                      setCurrentAuth({
                        header: headerContent,
                        type: 'raw',
                      });
                    }

                    disableEditing();
                  }}
                >
                  {SAVE_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty
                  iconType="crossInACircleFilled"
                  size="s"
                  color="danger"
                  onClick={() => disableEditing()}
                >
                  {CANCEL_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : currentAuth === undefined ? (
            <EuiButton
              color="success"
              iconType="plusInCircle"
              size="s"
              onClick={() => enableEditing(currentAuth)}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
                {
                  defaultMessage: 'Add credentials',
                }
              )}
            </EuiButton>
          ) : (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButtonEmpty color="primary" size="s" onClick={() => enableEditing(currentAuth)}>
                  {EDIT_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty
                  color="primary"
                  size="s"
                  onClick={() => {
                    setIsModalVisible(true);
                  }}
                >
                  {DELETE_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
        subtitle={
          <FormattedMessage
            id="xpack.enterpriseSearch.crawler.authenticationPanel.description"
            defaultMessage="Credentials are used when requests originate from crawlers."
          />
        }
      >
        {isEditing ? (
          <EuiFormFieldset>
            <EuiFlexGroup direction="row">
              <EuiFlexItem>
                <EuiCheckableCard
                  id="basicAuthenticationCheckableCard"
                  className="authenticationCheckable"
                  label={
                    <EuiTitle size="xxs">
                      <h5>{AUTHENTICATION_LABELS.basic}</h5>
                    </EuiTitle>
                  }
                  value="basic"
                  checked={selectedAuthOption === 'basic'}
                  onChange={() => selectAuthOption('basic')}
                >
                  <EuiForm>
                    <EuiFormRow label={USERNAME_LABEL}>
                      <EuiFieldText
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        disabled={selectedAuthOption !== 'basic'}
                      />
                    </EuiFormRow>
                    <EuiFormRow label={PASSWORD_LABEL}>
                      <EuiFieldPassword
                        type="dual"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={selectedAuthOption !== 'basic'}
                      />
                    </EuiFormRow>
                  </EuiForm>
                </EuiCheckableCard>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCheckableCard
                  id="authenticationHeaderCheckableCard"
                  className="authenticationCheckable"
                  label={
                    <EuiTitle size="xxs">
                      <h5>{AUTHENTICATION_LABELS.raw}</h5>
                    </EuiTitle>
                  }
                  value="raw"
                  checked={selectedAuthOption === 'raw'}
                  onChange={() => selectAuthOption('raw')}
                >
                  <EuiForm>
                    <EuiFormRow label={PASSWORD_LABEL}>
                      <EuiFieldPassword
                        type="dual"
                        value={headerContent}
                        onChange={(event) => setHeaderContent(event.target.value)}
                        disabled={selectedAuthOption !== 'raw'}
                      />
                    </EuiFormRow>
                  </EuiForm>
                </EuiCheckableCard>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormFieldset>
        ) : (
          <>
            {currentAuth === undefined ? (
              <EuiEmptyPrompt
                title={
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.title',
                      {
                        defaultMessage: 'There are no credentials for this domain',
                      }
                    )}
                  </h4>
                }
                body={i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.description',
                  {
                    defaultMessage: 'Add credentials to requests originating from crawlers',
                  }
                )}
                titleSize="s"
              />
            ) : (
              <>
                {currentAuth !== undefined && isBasicCrawlerAuth(currentAuth) && (
                  <EuiBasicTable
                    items={[currentAuth]}
                    columns={[
                      {
                        name: TYPE_LABEL,
                        render: () => AUTHENTICATION_LABELS.basic,
                      },
                      {
                        name: USERNAME_LABEL,
                        field: 'username',
                      },
                      {
                        name: PASSWORD_LABEL,
                        render: (item: BasicCrawlerAuth) =>
                          areCredentialsVisible
                            ? item.password
                            : item.password
                                .split('')
                                .map(() => '•')
                                .join(''),
                      },
                      {
                        actions: [
                          {
                            name: '',
                            description: TOGGLE_VISIBILITY_LABEL,
                            type: 'icon',
                            icon: 'eye',
                            color: 'primary',
                            onClick: () => {
                              toggleCredentialVisibility();
                            },
                          },
                        ],
                      },
                    ]}
                  />
                )}
                {currentAuth !== undefined && isRawCrawlerAuth(currentAuth) && (
                  <EuiBasicTable
                    items={[currentAuth]}
                    columns={[
                      {
                        name: i18n.translate(
                          'xpack.enterpriseSearch.crawler.authenticationPanel.typeLabel',
                          { defaultMessage: 'Type' }
                        ),
                        render: () => AUTHENTICATION_LABELS.raw,
                      },
                      {
                        name: PASSWORD_LABEL,
                        render: (item: RawCrawlerAuth) =>
                          areCredentialsVisible
                            ? item.header
                            : item.header
                                .split('')
                                .map(() => '•')
                                .join(''),
                      },
                      {
                        actions: [
                          {
                            name: '',
                            description: TOGGLE_VISIBILITY_LABEL,
                            type: 'icon',
                            icon: 'eye',
                            color: 'primary',
                            onClick: () => {
                              toggleCredentialVisibility();
                            },
                          },
                        ],
                      },
                    ]}
                  />
                )}
              </>
            )}
          </>
        )}
      </DataPanel>
      {isModalVisible && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.title',
            {
              defaultMessage: 'Are you sure you want to delete {authType} credentials??',
              values: {
                authType: currentAuth ? AUTHENTICATION_LABELS[currentAuth?.type] : '',
              },
            }
          )}
          onCancel={(event) => {
            event?.preventDefault();
            setIsModalVisible(false);
          }}
          onConfirm={(event) => {
            event.preventDefault();
            setCurrentAuth(undefined);
            setIsModalVisible(false);
          }}
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.deleteButtonLabel',
            {
              defaultMessage: 'Delete credentials',
            }
          )}
          defaultFocusedButton="confirm"
        >
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.description',
            {
              defaultMessage:
                'Deleting these credentials might prevent the crawler from indexing protected areas of the domain. This can not be undone.',
            }
          )}
        </EuiConfirmModal>
      )}
    </>
  );
};
