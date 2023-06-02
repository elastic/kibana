/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconProps,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiPaddingCSS,
  useEuiShadow,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import styled from 'styled-components';
import progress from './images/progress.svg';
import protect from './images/protect.svg';
import invite from './images/invite.svg';
import respond from './images/respond.svg';

interface Section {
  id: string;
  title: string;
  titleSize?: 's' | 'xs' | 'xxs';
  titleElement?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  sections?: Section[];
  icon?: EuiIconProps;
  description?: string;
}

const CustomShadowPanel = styled(EuiPanel)<{ shadow: string }>`
  ${(props) => props.shadow}
`;

const headerCards: Section[] = [
  {
    icon: { type: 'checkInCircleFilled', size: 'xxl', color: '#00BFB3' },
    title: 'Project created',
    description: `View all projects here.`,
    id: 'projectCreated',
  },
  {
    icon: { type: invite, size: 'xxl' },
    title: 'Invite your team',
    description: `Boost security through collaboration`,
    id: 'inviteYourTeam',
  },
  {
    icon: { type: progress, size: 'xxl' },
    title: 'Progress tracker',
    id: 'progressTracker',
  },
];

const body: Section[] = [
  {
    id: 'getSetUp',
    title: 'Get set up',
    sections: [
      {
        icon: { type: 'securityApp', size: 'xl', className: 'eui-alignMiddle' },
        titleSize: 'xxs',
        title: 'Introduction',
        id: 'introduction',
      },
      {
        icon: { type: 'agentApp', size: 'xl' },
        titleSize: 'xxs',
        title: 'Bring in your data',
        id: 'bringInYourData',
      },
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        titleSize: 'xxs',
        title: 'Activate and create rules',
        id: 'activateAndCreateRules',
      },
      {
        icon: { type: protect, size: 'xl' },
        titleSize: 'xxs',
        title: 'Protect your environment in runtime',
        id: 'protectYourEnvironmentInRuntime',
      },
    ],
  },
  {
    id: 'getMoreFromElasticSecurity',
    title: 'Get more from Elastic Security',
    sections: [
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        titleSize: 'xxs',
        title: 'Master the investigations workflow',
        id: 'masterTheInvestigationsWorkflow',
      },
      {
        icon: { type: respond, size: 'xl' },
        titleSize: 'xxs',
        title: 'Respond to threats with automation',
        id: 'respondToThreatsWithAutomation',
      },
      {
        icon: { type: 'spacesApp', size: 'xl' },
        titleSize: 'xxs',
        title: 'Optimize your workspace',
        id: 'optimizeYourWorkspace',
      },
    ],
  },
];

const switches = [
  {
    id: 'analytics',
    label: 'Analytics',
  },
  {
    id: 'cloud',
    label: 'Cloud',
  },
  {
    id: 'endpoint',
    label: 'Endpoint',
  },
];

const setUpCardNodes = (sections: Section[]) =>
  sections.map((item, index) => {
    return (
      <EuiFlexItem key={`set-up-card-${index}`}>
        <EuiCard
          layout="horizontal"
          icon={item.icon ? <EuiIcon {...item.icon} /> : undefined}
          title={
            <EuiTitle size="s" css={{ fontSize: '19px' }}>
              <span>{item.title}</span>
            </EuiTitle>
          }
          description={<span style={{ color: `#98A2B3` }}>{item.description}</span>}
          hasBorder
          paddingSize="l"
        />
      </EuiFlexItem>
    );
  });

export const GetStartedComponent: React.FC = () => {
  const checked = false;
  const onChange = (e: any) => {};

  const paddingStyles = useEuiPaddingCSS('left');
  const cssStyles = { padding: `0 0 0 10px` };
  const shadow = useEuiShadow('s');

  const switchNodes = () => {
    return switches.map((item) => (
      <EuiSwitch
        key={item.id}
        data-test-subj={item.id}
        label={item.label}
        onChange={(e) => onChange(e)}
        css={cssStyles}
        checked={checked}
      />
    ));
  };

  const setUpBodydNodes = (sections: Section[]) =>
    sections.map((item, index) => {
      return (
        <EuiFlexItem key={`set-up-card-${index}`}>
          <CustomShadowPanel hasBorder paddingSize="m" shadow={shadow}>
            <EuiFlexGroup gutterSize="m" style={{ gap: '14px', padding: `2px 10px` }}>
              <EuiFlexItem grow={false}>
                {item.icon && <EuiIcon {...item.icon} className="eui-alignMiddle" />}
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiTitle size="xxs" css={{ lineHeight: '32px' }}>
                  <h4>{item.title}</h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </CustomShadowPanel>
        </EuiFlexItem>
      );
    });

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false}>
      <KibanaPageTemplate.Header
        style={{ padding: '0 36px' }}
        pageTitle={
          <EuiTitle size="l" css={{ paddingLeft: '4px' }}>
            <span>
              {i18n.translate('xpack.serverlessSecurity.getStarted.title', {
                defaultMessage: `Welcome`,
              })}
            </span>
          </EuiTitle>
        }
        description={
          <>
            <strong className="eui-displayBlock">
              {i18n.translate('xpack.serverlessSecurity.getStarted.subTitle', {
                defaultMessage: `Let’s get started`,
              })}
            </strong>
            <span className="eui-displayBlock">
              {i18n.translate('xpack.serverlessSecurity.getStarted.description', {
                defaultMessage: `Set up your Elastic Security workspace.  Use the toggles below to curate a list of tasks that best fits your environment`,
              })}
            </span>
          </>
        }
      >
        {headerCards && (
          <EuiFlexGroup style={{ gap: '32px' }}>{setUpCardNodes(headerCards)}</EuiFlexGroup>
        )}
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={false}
        restrictWidth={false}
        paddingSize="none"
      >
        <CustomShadowPanel
          color="plain"
          element="div"
          grow={false}
          paddingSize="none"
          hasShadow={false}
          shadow={shadow}
          style={{ padding: '20px 36px' }}
          borderRadius="none"
        >
          <EuiTitle size="xxs" css={{ paddingRight: `4px` }}>
            <strong>
              {i18n.translate('xpack.serverlessSecurity.getStartedProductLabel.title', {
                defaultMessage: `Curate your Get Started experience:`,
              })}
            </strong>
          </EuiTitle>
          <EuiText size="s" className="eui-displayInline">
            {switchNodes()}
          </EuiText>
        </CustomShadowPanel>

        <div style={{ padding: `4px 36px` }}>
          {body.map((section) => (
            <EuiPanel
              color="plain"
              element="div"
              grow={false}
              paddingSize="none"
              hasShadow={false}
              borderRadius="none"
              style={{ padding: `24px 0` }}
              key={section.id}
            >
              <EuiTitle size="xxs">
                <span>{section.title}</span>
              </EuiTitle>
              <EuiSpacer size="m" />
              {section.sections && (
                <EuiFlexGroup gutterSize="m" direction="column" style={{ gap: `16px` }}>
                  {setUpBodydNodes(section.sections)}
                </EuiFlexGroup>
              )}
            </EuiPanel>
          ))}
        </div>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

export const GetStarted = React.memo(GetStartedComponent);
