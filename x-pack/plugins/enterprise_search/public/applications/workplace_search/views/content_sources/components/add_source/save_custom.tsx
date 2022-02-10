/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';
import { LicensingLogic } from '../../../../../shared/licensing';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { LicenseBadge } from '../../../../components/shared/license_badge';
import {
  SOURCES_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  getContentSourcePath,
  getSourcesPath,
} from '../../../../routes';
import { CustomSource } from '../../../../types';
import { LEARN_CUSTOM_FEATURES_BUTTON } from '../../constants';

import { SourceIdentifier } from '../source_identifier';

import {
  SAVE_CUSTOM_BODY1,
  SAVE_CUSTOM_BODY2,
  SAVE_CUSTOM_RETURN_BUTTON,
  SAVE_CUSTOM_VISUAL_WALKTHROUGH_TITLE,
  SAVE_CUSTOM_VISUAL_WALKTHROUGH_LINK,
  SAVE_CUSTOM_STYLING_RESULTS_TITLE,
  SAVE_CUSTOM_STYLING_RESULTS_LINK,
  SAVE_CUSTOM_DOC_PERMISSIONS_TITLE,
  SAVE_CUSTOM_DOC_PERMISSIONS_LINK,
} from './constants';

interface SaveCustomProps {
  documentationUrl: string;
  newCustomSource: CustomSource;
  isOrganization: boolean;
  header: React.ReactNode;
}

export const SaveCustom: React.FC<SaveCustomProps> = ({
  documentationUrl,
  newCustomSource: { id, name },
  isOrganization,
  header,
}) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  return (
    <>
      {header}
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={2}>
          <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
            <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="l">
                  <EuiTextAlign textAlign="center">
                    <h1>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.heading',
                        {
                          defaultMessage: '{name} Created',
                          values: { name },
                        }
                      )}
                    </h1>
                  </EuiTextAlign>
                </EuiTitle>
                <EuiText grow={false}>
                  <EuiTextAlign textAlign="center">
                    {SAVE_CUSTOM_BODY1}
                    <br />
                    {SAVE_CUSTOM_BODY2}
                    <br />
                    <EuiLinkTo to={getSourcesPath(SOURCES_PATH, isOrganization)}>
                      {SAVE_CUSTOM_RETURN_BUTTON}
                    </EuiLinkTo>
                  </EuiTextAlign>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule />
            <EuiSpacer size="s" />
            <SourceIdentifier id={id} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup justifyContent="flexStart" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <div>
                <EuiTitle size="xs">
                  <h4>{SAVE_CUSTOM_VISUAL_WALKTHROUGH_TITLE}</h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.documentation.text"
                      defaultMessage="{link} to learn more about Custom API Sources."
                      values={{
                        link: (
                          <EuiLink target="_blank" href={documentationUrl}>
                            {SAVE_CUSTOM_VISUAL_WALKTHROUGH_LINK}
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </div>
              <EuiSpacer />
              <div>
                <EuiTitle size="xs">
                  <h4>{SAVE_CUSTOM_STYLING_RESULTS_TITLE}</h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.displaySettings.text"
                      defaultMessage="Use {link} to customize how your documents will appear within your search results. Workplace Search will use fields in alphabetical order by default."
                      values={{
                        link: (
                          <EuiLinkTo
                            to={getContentSourcePath(
                              SOURCE_DISPLAY_SETTINGS_PATH,
                              id,
                              isOrganization
                            )}
                          >
                            {SAVE_CUSTOM_STYLING_RESULTS_LINK}
                          </EuiLinkTo>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </div>
              <EuiSpacer />
              <div>
                <EuiSpacer size="s" />
                {!hasPlatinumLicense && <LicenseBadge />}
                <EuiSpacer size="s" />
                <EuiTitle size="xs">
                  <h4>{SAVE_CUSTOM_DOC_PERMISSIONS_TITLE}</h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.permissions.text"
                      defaultMessage="{link} manage content access on individual or group attributes. Allow or deny access to specific documents."
                      values={{
                        link: (
                          <EuiLink
                            target="_blank"
                            href={docLinks.workplaceSearchCustomSourcePermissions}
                          >
                            {SAVE_CUSTOM_DOC_PERMISSIONS_LINK}
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="xs" />
                {!hasPlatinumLicense && (
                  <EuiText size="s">
                    <EuiLink target="_blank" href={docLinks.licenseManagement}>
                      {LEARN_CUSTOM_FEATURES_BUTTON}
                    </EuiLink>
                  </EuiText>
                )}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
