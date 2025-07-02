/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  IconType,
  useEuiTheme,
  useIsWithinBreakpoints,
  EuiFlexGrid,
} from '@elastic/eui';
import { IntegrationType } from '@kbn/wci-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { IntegrationListView } from './integration_list_view';
import { getIntegrationIcon, isIntegrationDisabled } from '../utils';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';

interface IntegrationCardData {
  title: string;
  icon: IconType;
  description: string;
  disabled?: boolean;
}

const integrationCards: Record<IntegrationType, IntegrationCardData> = {
  [IntegrationType.index_source]: {
    title: i18n.translate('workchatApp.integrations.listView.importIndexCard', {
      defaultMessage: 'Import Index',
    }),
    icon: getIntegrationIcon(IntegrationType.index_source),
    description: i18n.translate('workchatApp.integrations.listView.importIndexDescription', {
      defaultMessage:
        'Choose an existing index to connect and start using it in your workflows without re-importing your data',
    }),
    disabled: isIntegrationDisabled(IntegrationType.index_source),
  },
  [IntegrationType.external_server]: {
    title: i18n.translate('workchatApp.integrations.listView.externalServerCard', {
      defaultMessage: 'External Server',
    }),
    icon: getIntegrationIcon(IntegrationType.external_server) as IconType,
    description: i18n.translate('workchatApp.integrations.listView.externalServerDescription', {
      defaultMessage: 'Connect to external servers for data processing.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.external_server),
  },
  [IntegrationType.salesforce]: {
    title: i18n.translate('workchatApp.integrations.listView.salesforceCard', {
      defaultMessage: 'Salesforce',
    }),
    icon: getIntegrationIcon(IntegrationType.salesforce) as IconType,
    description: i18n.translate('workchatApp.integrations.listView.salesforceDescription', {
      defaultMessage:
        'Connect your Salesforce account to bring in customer records, case data, and account insights for use in workflows',
    }),
    disabled: isIntegrationDisabled(IntegrationType.salesforce),
  },
  [IntegrationType.google_drive]: {
    title: i18n.translate('workchatApp.integrations.listView.googleDriveCard', {
      defaultMessage: 'Google Drive',
    }),
    icon: getIntegrationIcon(IntegrationType.google_drive),
    description: i18n.translate('workchatApp.integrations.listView.googleDriveDescription', {
      defaultMessage: 'Search and summarize content from your Drive files',
    }),
    disabled: isIntegrationDisabled(IntegrationType.google_drive),
  },
  [IntegrationType.sharepoint]: {
    title: i18n.translate('workchatApp.integrations.listView.sharepointCard', {
      defaultMessage: 'Sharepoint',
    }),
    icon: getIntegrationIcon(IntegrationType.sharepoint),
    description: i18n.translate('workchatApp.integrations.listView.sharepointDescription', {
      defaultMessage: 'Connect internal documents and sites for enterprise-wide search.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.sharepoint),
  },
  [IntegrationType.slack]: {
    title: i18n.translate('workchatApp.integrations.listView.slackCard', {
      defaultMessage: 'Slack',
    }),
    icon: getIntegrationIcon(IntegrationType.slack),
    description: i18n.translate('workchatApp.integrations.listView.slackDescription', {
      defaultMessage: 'Search conversations and surface relevant team discussions.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.slack),
  },
  [IntegrationType.confluence]: {
    title: i18n.translate('workchatApp.integrations.listView.confluenceCard', {
      defaultMessage: 'Confluence',
    }),
    icon: getIntegrationIcon(IntegrationType.confluence),
    description: i18n.translate('workchatApp.integrations.listView.confluenceDescription', {
      defaultMessage: 'Tap into your internal knowledge base for accurate answers.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.confluence),
  },
  [IntegrationType.jira]: {
    title: i18n.translate('workchatApp.integrations.listView.jiraCard', {
      defaultMessage: 'Jira',
    }),
    icon: getIntegrationIcon(IntegrationType.jira),
    description: i18n.translate('workchatApp.integrations.listView.jiraDescription', {
      defaultMessage: 'Bring in issue tracking, tickets, and project context.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.jira),
  },
  [IntegrationType.github]: {
    title: i18n.translate('workchatApp.integrations.listView.githubCard', {
      defaultMessage: 'Github',
    }),
    icon: getIntegrationIcon(IntegrationType.github),
    description: i18n.translate('workchatApp.integrations.listView.githubDescription', {
      defaultMessage: 'Search repos, issues, and documentation for engineering insights.',
    }),
    disabled: isIntegrationDisabled(IntegrationType.github),
  },
};

export const IntegrationCatalogView: React.FC = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's', 'm']);
  const isLarge = useIsWithinBreakpoints(['l']);
  const columns = isMobile ? 1 : isLarge ? 2 : 3;

  const backgroundCircle = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -10px;
    margin-right: 15px;
  `;
  const iconStyle = css`
    margin-left: 8px;
    cursor: pointer;
  `;

  const titleStyle = css`
    display: flex;
    align-items: center;
  `;

  return (
    <KibanaPageTemplate data-test-subj="toolsCatalogPage">
      <IntegrationListView tab={'catalog'} />
      <EuiHorizontalRule margin="none" css={{ height: 2 }} />
      <KibanaPageTemplate.Section>
        <EuiText>
          <strong>
            {i18n.translate('workchatApp.integrations.listView.available', {
              defaultMessage: 'Available',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGrid gutterSize="m" columns={columns}>
          {Object.entries(integrationCards)
            .filter(([_, cardData]) => !cardData.disabled)
            .map(([type, cardData]) => (
              <EuiFlexItem key={type}>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <div className={backgroundCircle}>
                      <EuiIcon size="xl" type={cardData.icon} />
                    </div>
                  }
                  title={
                    <div className={titleStyle}>
                      {cardData.title}
                      <EuiIcon type="info" size="s" className={iconStyle} />
                    </div>
                  }
                  titleSize="xs"
                  description={cardData.description}
                  paddingSize="l"
                  onClick={() => {
                    return navigateToWorkchatUrl(`${appPaths.tools.create}?type=${type}`);
                  }}
                />
              </EuiFlexItem>
            ))}
        </EuiFlexGrid>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section>
        <EuiText>
          <strong>
            {i18n.translate('workchatApp.integrations.listView.comingsoon', {
              defaultMessage: 'Coming soon',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGrid gutterSize="m" columns={columns}>
          {Object.entries(integrationCards)
            .filter(([_, cardData]) => cardData.disabled)
            .map(([type, cardData]) => (
              <EuiFlexItem key={type}>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <div className={backgroundCircle}>
                      <EuiIcon size="xl" type={cardData.icon} />
                    </div>
                  }
                  title={
                    <div className={titleStyle}>
                      {cardData.title}
                      <EuiIcon type="info" size="s" className={iconStyle} />
                    </div>
                  }
                  titleSize="xs"
                  description={cardData.description}
                  paddingSize="l"
                  isDisabled={cardData.disabled}
                />
              </EuiFlexItem>
            ))}
        </EuiFlexGrid>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
