/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiForm,
  EuiFieldText,
  EuiFieldPassword,
  EuiButton,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiCheckableCard,
  EuiFormFieldset,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DataPanel } from '../../../shared/data_panel/data_panel';

import {
  AuthenticationPanelLogic,
  CrawlerAuth,
  isBasicCrawlerAuth,
  isRawCrawlerAuth,
} from './authentication_panel_logic';

export const AuthenticationPanel: React.FC = () => {
  const currentAuth: CrawlerAuth | undefined = {
    header: 'authorization',
    type: 'raw',
  };

  const {
    disableEditing,
    enableEditing,
    selectAuthOption,
    setHeaderContent,
    setPassword,
    setUsername,
  } = useActions(AuthenticationPanelLogic);
  const { headerContent, isEditing, username, password, selectedAuthOption } =
    useValues(AuthenticationPanelLogic);

  return (
    <DataPanel
      hasBorder
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.title', {
            defaultMessage: 'Request authentiction',
          })}
        </h2>
      }
      action={
        isEditing ? (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiButton iconType="check" size="s" color="success" onClick={() => disableEditing()}>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
                  {
                    defaultMessage: 'Save',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton iconType="cross" size="s" color="danger" onClick={() => disableEditing()}>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButton>
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
              <EuiButton iconType="pencil" size="s" onClick={() => enableEditing(currentAuth)}>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
                  {
                    defaultMessage: 'Edit credentials',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton iconType="cross" color="danger" size="s" onClick={() => {}}>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
                  {
                    defaultMessage: 'Delete credentials',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      }
      subtitle={
        <FormattedMessage
          id="xpack.enterpriseSearch.crawler.authenticationPanel.description"
          defaultMessage="Add credentials to requests originating from the crawler."
        />
      }
    >
      {isEditing ? (
        <EuiFormFieldset
          legend={{
            children: (
              <EuiTitle size="xs">
                <span>Select an authentication method</span>
              </EuiTitle>
            ),
          }}
        >
          <EuiCheckableCard
            id="basicAuthenticationCheckableCard"
            label={
              <EuiTitle size="xxs">
                <h5>Basic authentication</h5>
              </EuiTitle>
            }
            value="basic"
            checked={selectedAuthOption === 'basic'}
            onChange={() => selectAuthOption('basic')}
          >
            <EuiForm>
              <EuiFormRow label="Username">
                <EuiFieldText
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={selectedAuthOption !== 'basic'}
                />
              </EuiFormRow>
              <EuiFormRow label="Password">
                <EuiFieldPassword
                  type="dual"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={selectedAuthOption !== 'basic'}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiCheckableCard>

          <EuiSpacer size="m" />

          <EuiCheckableCard
            id="authenticationHeaderCheckableCard"
            label={
              <EuiTitle size="xxs">
                <h5>Authentication header</h5>
              </EuiTitle>
            }
            value="raw"
            checked={selectedAuthOption === 'raw'}
            onChange={() => selectAuthOption('raw')}
          >
            <EuiForm>
              <EuiFormRow label="Header content">
                <EuiFieldPassword
                  type="dual"
                  value={headerContent}
                  onChange={(event) => setHeaderContent(event.target.value)}
                  disabled={selectedAuthOption !== 'raw'}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiCheckableCard>
        </EuiFormFieldset>
      ) : (
        <>
          {currentAuth === undefined ? (
            <EuiEmptyPrompt
              title={<h4>{"You haven't set authentication for this domain"}</h4>}
              titleSize="s"
              actions={<EuiButton onClick={() => enableEditing()}>Add credentials</EuiButton>}
            />
          ) : (
            <>
              {currentAuth !== undefined && isBasicCrawlerAuth(currentAuth) && (
                <>
                  <EuiTitle size="xxs">
                    <h4>Basic authentication</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiForm>
                    <EuiFormRow label="Username">
                      <EuiFieldText value={currentAuth.username} readOnly />
                    </EuiFormRow>
                    <EuiFormRow label="Password">
                      <EuiFieldPassword type="dual" value={currentAuth.password} readOnly />
                    </EuiFormRow>
                  </EuiForm>
                </>
              )}
              {currentAuth !== undefined && isRawCrawlerAuth(currentAuth) && (
                <>
                  <EuiTitle size="xxs">
                    <h4>Authorization Header</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiForm>
                    <EuiFormRow label="Header content">
                      <EuiFieldPassword type="dual" value={currentAuth.header} readOnly />
                    </EuiFormRow>
                  </EuiForm>
                </>
              )}
            </>
          )}
        </>
      )}
    </DataPanel>
  );
};
