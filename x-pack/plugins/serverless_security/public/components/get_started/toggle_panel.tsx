/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useReducer } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import respond from './images/respond.svg';
import protect from './images/protect.svg';
import { Section, Switch, TogglePanelAction, TogglePanelId, TogglePanelReducer } from './types';
import * as i18n from './translations';

const ActiveConditions = {
  anyCondition: [TogglePanelId.Analytics, TogglePanelId.Cloud, TogglePanelId.Endpoint],
  analyticsToggled: [TogglePanelId.Analytics],
  cloudToggled: [TogglePanelId.Cloud],
  endpointToggled: [TogglePanelId.Endpoint],
};

const body: Section[] = [
  {
    id: 'getSetUp',
    title: i18n.GET_SET_UP_TITLE,
    sections: [
      {
        icon: { type: 'securityApp', size: 'xl', className: 'eui-alignMiddle' },
        titleSize: 'xxs',
        title: i18n.INTRODUCTION_TITLE,
        id: 'introduction',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: 'agentApp', size: 'xl' },
        titleSize: 'xxs',
        title: i18n.BRING_IN_YOUR_DATA_TITLE,
        id: 'bringInYourData',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        titleSize: 'xxs',
        title: i18n.ACTIVATE_AND_CREATE_RULES_TITLE,
        id: 'activateAndCreateRules',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: protect, size: 'xl' },
        titleSize: 'xxs',
        title: i18n.PROTECT_YOUR_ENVIRONMENT_TITLE,
        id: 'protectYourEnvironmentInRuntime',
        activeConditions: [...ActiveConditions.cloudToggled, ...ActiveConditions.endpointToggled],
      },
    ],
  },
  {
    id: 'getMoreFromElasticSecurity',
    title: i18n.GET_MORE_TITLE,
    sections: [
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        titleSize: 'xxs',
        title: i18n.MASTER_THE_INVESTIGATION_TITLE,
        id: 'masterTheInvestigationsWorkflow',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: respond, size: 'xl' },
        titleSize: 'xxs',
        title: i18n.RESPOND_TO_THREATS_TITLE,
        id: 'respondToThreatsWithAutomation',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: 'spacesApp', size: 'xl' },
        titleSize: 'xxs',
        title: i18n.OPTIMIZE_YOUR_WORKSPACE_TITLE,
        id: 'optimizeYourWorkspace',
        activeConditions: ActiveConditions.anyCondition,
      },
    ],
  },
];

const switches: Switch[] = [
  {
    id: TogglePanelId.Analytics,
    label: i18n.ANALYTICS_SWITCH_LABEL,
  },
  {
    id: TogglePanelId.Cloud,
    label: i18n.CLOUD_SWITCH_LABEL,
  },
  {
    id: TogglePanelId.Endpoint,
    label: i18n.ENDPOINT_SWITCH_LABEL,
  },
];

const reducer = (state: TogglePanelReducer, action: TogglePanelAction) => {
  if (action.type === 'toggleSection') {
    if (state.activeSections.has(action.payload.section)) {
      state.activeSections.delete(action.payload.section);
    } else {
      state.activeSections.add(action.payload.section);
    }

    return {
      ...state,
      activeSections: state.activeSections,
    };
  }
  return state;
};

const initialState: TogglePanelReducer = { activeSections: new Set<TogglePanelId>() };

const TogglePanelComponent = ({}) => {
  const { euiTheme } = useEuiTheme();
  const [state, dispatch] = useReducer(reducer, initialState);
  const shadowS = useEuiShadow('s');

  const switchNodes = () => {
    return switches.map((item) => (
      <EuiSwitch
        key={item.id}
        data-test-subj={item.id}
        label={item.label}
        onChange={() => {
          dispatch({ type: 'toggleSection', payload: { section: item.id } });
        }}
        css={css`
          padding-left: 10px;
        `}
        checked={state.activeSections.has(item.id)}
      />
    ));
  };

  const setUpBodyNodes = useCallback(
    (sections: Section[] | undefined, activeSections: Set<TogglePanelId>) =>
      sections?.reduce<React.ReactNode[]>((acc, item, index) => {
        if (item?.activeConditions?.some((condition) => activeSections.has(condition))) {
          acc.push(
            <EuiFlexItem key={`set-up-card-${index}`}>
              <EuiPanel
                hasBorder
                paddingSize="m"
                css={css`
                  ${shadowS};
                `}
              >
                <EuiFlexGroup
                  gutterSize="m"
                  css={css`
                    gap: 14px;
                    padding: ${euiTheme.size.xxs} 10px;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    {item.icon && <EuiIcon {...item.icon} className="eui-alignMiddle" />}
                  </EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <EuiTitle
                      size="xxs"
                      css={css`
                        line-height: ${euiTheme.base * 2}px;
                      `}
                    >
                      <h4>{item.title}</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          );
        }
        return acc;
      }, []),
    [euiTheme.base, euiTheme.size.xxs, shadowS]
  );

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel
          color="plain"
          element="div"
          grow={false}
          paddingSize="none"
          hasShadow={false}
          css={css`
            padding: ${euiTheme.base * 1.25}px ${euiTheme.base * 2.25}px;
            ${shadowS};
          `}
          borderRadius="none"
        >
          <EuiTitle
            size="xxs"
            css={css`
              padding-right: ${euiTheme.size.xs};
            `}
          >
            <strong>{i18n.TOGGLE_PANEL_TITLE}</strong>
          </EuiTitle>
          <EuiText size="s" className="eui-displayInline">
            {switchNodes()}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.base * 2.25}px;
        `}
        grow={1}
      >
        {state.activeSections.size > 0 ? (
          body.reduce<React.ReactNode[]>((acc, section) => {
            const nodes = setUpBodyNodes(section.sections, state.activeSections);
            if (nodes && nodes.length > 0) {
              acc.push(
                <EuiPanel
                  color="plain"
                  element="div"
                  grow={false}
                  paddingSize="none"
                  hasShadow={false}
                  borderRadius="none"
                  css={css`
                    margin: ${euiTheme.size.l} 0;
                  `}
                  key={section.id}
                >
                  <EuiTitle size="xxs">
                    <span>{section.title}</span>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup
                    gutterSize="m"
                    direction="column"
                    css={css`
                      ${euiTheme.size.base}
                    `}
                  >
                    {nodes}
                  </EuiFlexGroup>
                </EuiPanel>
              );
            }
            return acc;
          }, [])
        ) : (
          <EuiEmptyPrompt
            iconType="magnifyWithExclamation"
            title={<h2>{i18n.TOGGLE_PANEL_EMPTY_TITLE}</h2>}
            body={<p>{i18n.TOGGLE_PANEL_EMPTY_DESCRIPTION}</p>}
            css={css`
              padding: ${euiTheme.base * 5}px 0;
              .euiEmptyPrompt__contentInner {
                max-width: none;
              }
            `}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TogglePanel = React.memo(TogglePanelComponent);
