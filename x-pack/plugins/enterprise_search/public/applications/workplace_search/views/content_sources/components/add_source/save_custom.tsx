/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Link } from 'react-router-dom';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';

import { CredentialItem } from '../../../../components/shared/credential_item';
import { LicenseBadge } from '../../../../components/shared/license_badge';

import { CustomSource } from '../../../../types';
import {
  SOURCES_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  CUSTOM_API_DOCUMENT_PERMISSIONS_DOCS_URL,
  ENT_SEARCH_LICENSE_MANAGEMENT,
  getContentSourcePath,
  getSourcesPath,
} from '../../../../routes';

interface SaveCustomProps {
  documentationUrl: string;
  newCustomSource: CustomSource;
  isOrganization: boolean;
  header: React.ReactNode;
}

export const SaveCustom: React.FC<SaveCustomProps> = ({
  documentationUrl,
  newCustomSource: { key, id, accessToken, name },
  isOrganization,
  header,
}) => (
  <div className="custom-api-step-2">
    {header}
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={2}>
        <EuiPanel paddingSize="l">
          <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <EuiTextAlign textAlign="center">
                  <h1>{name} Created</h1>
                </EuiTextAlign>
              </EuiTitle>
              <EuiText grow={false}>
                <EuiTextAlign textAlign="center">
                  Your endpoints are ready to accept requests.
                  <br />
                  Be sure to copy your API keys below.
                  <br />
                  <Link to={getSourcesPath(SOURCES_PATH, isOrganization)}>
                    <EuiLink>Return to Sources</EuiLink>
                  </Link>
                </EuiTextAlign>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>API Keys</h4>
              </EuiTitle>
              <EuiText grow={false} size="s" color="secondary">
                <p>You&apos;ll need these keys to sync documents for this custom source.</p>
              </EuiText>
              <EuiSpacer />
              <CredentialItem label="Access Token" value={accessToken} testSubj="AccessToken" />
              <EuiSpacer />
              <CredentialItem label="Key" value={key} testSubj="ContentSourceKey" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexStart" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            <div>
              <EuiTitle size="xs">
                <h4>Visual Walkthrough</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText color="secondary" size="s">
                <p>
                  <EuiLink target="_blank" href={documentationUrl}>
                    Check out the documentation
                  </EuiLink>{' '}
                  to learn more about Custom API Sources.
                </p>
              </EuiText>
            </div>
            <EuiSpacer />
            <div>
              <EuiTitle size="xs">
                <h4>Styling Results</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText color="secondary" size="s">
                <p>
                  Use{' '}
                  <Link to={getContentSourcePath(SOURCE_DISPLAY_SETTINGS_PATH, id, isOrganization)}>
                    <EuiLink>Display Settings</EuiLink>
                  </Link>{' '}
                  to customize how your documents will appear within your search results. Workplace
                  Search will use fields in alphabetical order by default.
                </p>
              </EuiText>
            </div>
            <EuiSpacer />
            <div>
              <EuiSpacer size="s" />
              <LicenseBadge />
              <EuiSpacer size="s" />
              <EuiTitle size="xs">
                <h4>Set document-level permissions</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText color="secondary" size="s">
                <p>
                  <EuiLink target="_blank" href={CUSTOM_API_DOCUMENT_PERMISSIONS_DOCS_URL}>
                    Document-level permissions
                  </EuiLink>{' '}
                  manage content access content on individual or group attributes. Allow or deny
                  access to specific documents.
                </p>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <EuiLink target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
                  Learn about Platinum features
                </EuiLink>
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
